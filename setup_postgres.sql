-- Run this in pgAdmin 4 (Query Tool) connected as the postgres superuser
-- Right-click your server → Query Tool → paste this → F5

CREATE USER raguser WITH PASSWORD 'ragpassword';
CREATE DATABASE ragdb OWNER raguser;
GRANT ALL PRIVILEGES ON DATABASE ragdb TO raguser;

-- Verify:
-- \du   (should show raguser)
-- \l    (should show ragdb)
