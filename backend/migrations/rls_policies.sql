-- Run in Supabase SQL editor after migrations
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access own holdings"
ON portfolio_holdings
FOR ALL
USING (user_id = auth.uid());
