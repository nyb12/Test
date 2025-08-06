
-- Tool table
CREATE TABLE tools (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    path TEXT,
    config JSONB,
    created_at TIMESTAMP DEFAULT now()
);

-- Tag table
CREATE TABLE tags (
    id UUID PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Mapping: tool <-> tag
CREATE TABLE tool_tags (
    tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (tool_id, tag_id)
);

-- Highlighted tools (subset of tools)
CREATE TABLE highlighted_tools (
    tool_id UUID PRIMARY KEY REFERENCES tools(id) ON DELETE CASCADE,
    priority INT DEFAULT 1
);
