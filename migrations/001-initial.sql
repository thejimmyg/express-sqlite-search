-- Up

CREATE VIRTUAL TABLE ft USING fts5(id, doc);
CREATE TABLE visibility (id varchar, title varchar, pub integer);

-- Down

DROP TABLE visibility;
DROP TABLE ft;

