-- Create Problems4UsDB on an existing Azure SQL server
-- Run with sqlcmd against the master database (Azure AD auth):
--   sqlcmd -S <server>.database.windows.net -d master -G -C -i database/create-database.sql

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'Problems4UsDB')
BEGIN
    CREATE DATABASE Problems4UsDB
    (
        EDITION = 'Basic',
        SERVICE_OBJECTIVE = 'Basic',
        MAXSIZE = 2 GB
    );
END
GO
