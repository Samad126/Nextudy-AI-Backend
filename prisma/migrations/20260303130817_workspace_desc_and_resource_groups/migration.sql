-- AlterTable
ALTER TABLE "User" ALTER COLUMN "hashedPassword" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "ResourceGroups" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "ResourceGroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ResourceToGroup" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ResourceToGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceGroups_title_key" ON "ResourceGroups"("title");

-- CreateIndex
CREATE INDEX "_ResourceToGroup_B_index" ON "_ResourceToGroup"("B");

-- AddForeignKey
ALTER TABLE "_ResourceToGroup" ADD CONSTRAINT "_ResourceToGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResourceToGroup" ADD CONSTRAINT "_ResourceToGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "ResourceGroups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
