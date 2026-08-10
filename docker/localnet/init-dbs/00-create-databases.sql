-- Runs once on first Postgres container start (mounted into
-- /docker-entrypoint-initdb.d). Creates the logical databases the SDK localnet needs:
--   swap          -> the swap service's Prisma database
--   squid_archive -> populated by substrate-ingest, read directly by the swap processor
--
-- CREATE DATABASE has no IF NOT EXISTS; this file only runs when the data volume is
-- empty. Wipe the volume (`down -v`) to re-run.
CREATE DATABASE swap;
CREATE DATABASE squid_archive;
