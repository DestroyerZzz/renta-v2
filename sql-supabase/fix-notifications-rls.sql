-- Fix notifications RLS for triggers
-- This policy allows the notifications to be created by triggers
-- regardless of the auth.uid

DROP POLICY IF EXISTS "Triggers can insert notifications" ON notifications;

CREATE POLICY "Triggers can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- Alternatively, you could use this more restrictive policy
-- which allows only authenticated users to create notifications for others
-- WITH CHECK (auth.uid() IS NOT NULL);
