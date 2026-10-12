/*
  Warnings:

  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SYSADMIN', 'LEAD_MENTOR', 'MENTOR', 'INTERN');

-- AlterTable
ALTER TABLE "group_members" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "mentorId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "refreshToken" TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'MENTOR';

-- CreateIndex
CREATE INDEX "group_members_userId_idx" ON "group_members"("userId");

-- CreateIndex
CREATE INDEX "groups_mentorId_idx" ON "groups"("mentorId");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
