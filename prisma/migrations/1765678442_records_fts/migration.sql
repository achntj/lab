-- Create Record table
CREATE TABLE "Record" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "kind" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT '',
  "sourceId" TEXT NOT NULL DEFAULT '',
  "title" TEXT NOT NULL,
  "content" TEXT,
  "url" TEXT,
  "category" TEXT,
  "tags" TEXT,
  "metadata" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Record_source_sourceId_key" ON "Record"("source", "sourceId");

-- FTS virtual table for full-text search
CREATE VIRTUAL TABLE "RecordSearch" USING fts5(
  title,
  content,
  url,
  category,
  tags,
  metadata,
  kind,
  source,
  sourceId,
  tokenize='porter'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER record_ai AFTER INSERT ON "Record" BEGIN
  INSERT INTO "RecordSearch"(rowid, title, content, url, category, tags, metadata, kind, source, sourceId)
  VALUES (new.id, new.title, new.content, new.url, new.category, new.tags, new.metadata, new.kind, new.source, new.sourceId);
END;

CREATE TRIGGER record_au AFTER UPDATE ON "Record" BEGIN
  UPDATE "RecordSearch"
    SET title = new.title,
        content = new.content,
        url = new.url,
        category = new.category,
        tags = new.tags,
        metadata = new.metadata,
        kind = new.kind,
        source = new.source,
        sourceId = new.sourceId
    WHERE rowid = new.id;
END;

CREATE TRIGGER record_ad AFTER DELETE ON "Record" BEGIN
  DELETE FROM "RecordSearch" WHERE rowid = old.id;
END;
