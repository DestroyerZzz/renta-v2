-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR NOT NULL, -- 'follow', 'post', 'interest'
    content TEXT,
    entity_id UUID, -- ID of the post, interest, or follow relationship
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS notifications_receiver_id_idx ON notifications(receiver_id);
CREATE INDEX IF NOT EXISTS notifications_sender_id_idx ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = receiver_id);

CREATE POLICY "Users can mark their notifications as read"
    ON notifications FOR UPDATE
    USING (auth.uid() = receiver_id)
    WITH CHECK (auth.uid() = receiver_id);

-- Trigger function to create notifications when a user follows another user
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for the followed user
    INSERT INTO notifications (receiver_id, sender_id, type, content, entity_id)
    VALUES (
        NEW.following_id,
        NEW.follower_id,
        'follow',
        'started following you',
        NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification on follow
CREATE TRIGGER on_follow_trigger
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION create_follow_notification();

-- Trigger function to create notifications when a user creates a post
CREATE OR REPLACE FUNCTION create_post_notification()
RETURNS TRIGGER AS $$
DECLARE
    follower_rec RECORD;
BEGIN
    -- For all followers of the post creator, create a notification
    FOR follower_rec IN (
        SELECT follower_id 
        FROM follows 
        WHERE following_id = NEW.user_id
    ) LOOP
        INSERT INTO notifications (receiver_id, sender_id, type, content, entity_id)
        VALUES (
            follower_rec.follower_id,
            NEW.user_id,
            'post',
            'published a new post',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification on new post
CREATE TRIGGER on_post_create_trigger
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION create_post_notification();

-- Trigger function to create notifications when a user creates a new interest
CREATE OR REPLACE FUNCTION create_interest_notification()
RETURNS TRIGGER AS $$
DECLARE
    follower_rec RECORD;
BEGIN
    -- For all followers of the interest creator, create a notification
    FOR follower_rec IN (
        SELECT follower_id 
        FROM follows 
        WHERE following_id = NEW.user_id
    ) LOOP
        INSERT INTO notifications (receiver_id, sender_id, type, content, entity_id)
        VALUES (
            follower_rec.follower_id,
            NEW.user_id,
            'interest',
            'added a new interest',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create notification on new interest
CREATE TRIGGER on_interest_create_trigger
AFTER INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION create_interest_notification();

-- Function to count unread notifications
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM notifications
        WHERE receiver_id = user_id AND read = false
    );
END;
$$ LANGUAGE plpgsql;
