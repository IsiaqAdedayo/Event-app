-- CreateTable
CREATE TABLE "_UserBookmarks" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_UserBookmarks_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_UserBookmarks_B_index" ON "_UserBookmarks"("B");

-- AddForeignKey
ALTER TABLE "_UserBookmarks" ADD CONSTRAINT "_UserBookmarks_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserBookmarks" ADD CONSTRAINT "_UserBookmarks_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
