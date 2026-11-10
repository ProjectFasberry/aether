-- Chat is removed as a product feature. The API has no chat routes or
-- subscribers; only the legacy tables remain.
DROP TABLE IF EXISTS "chat_views";
DROP TABLE IF EXISTS "privated_chat";
