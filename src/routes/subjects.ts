import express from "express";
import { eq, ilike, or, and, desc, sql, getTableColumns } from "drizzle-orm";

import { db } from "../db";
import { departments, subjects } from "../db/schema";

const router = express.Router();

//get all subjects with optional search, department filter and pagination
router.get("/", async (req, res) => {
    try {
        const { search, department, page = 1, limit = 10 } = req.query;

        const currentPage = Math.max(1, +page);
        const limitPerPage = Math.max(1, +limit);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        if (search) {
            filterConditions.push(
                or(
                    ilike(subjects.name, `%${search}%`),
                    ilike(subjects.code, `%${search}%`)
                )
            );
        }

        if (department) {
            filterConditions.push(ilike(departments.name, `%${department}%`));
        }

        const whereClause =
            filterConditions.length > 0 ? and(...filterConditions) : undefined;

        // Count query MUST include the join
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause);

        const totalCount = countResult[0]?.count ?? 0;

        // Data query
        const subjectsList = await db
            .select({
                ...getTableColumns(subjects),
                department: {
                    ...getTableColumns(departments),
                },
            })
            .from(subjects)
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .where(whereClause)
            .orderBy(desc(subjects.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: subjectsList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            },
        });
    } catch (error) {
        console.error("GET /subjects error:", error);
        res.status(500).json({ error: "Failed to fetch subjects" });
    }
});

//create a subject
router.post("/", async (req, res) => {
    try {
        const { departmentId, name, code, description } = req.body;

        const [createdSubject] = await db
            .insert(subjects)
            .values({ departmentId, name, code, description })
            .returning({ id: subjects.id });

        if (!createdSubject) throw Error;

        res.status(201).json({ data: createdSubject });

    } catch (error) {
        console.error("POST /subjects", error);
        res.status(500).json({ error: "Failed to create subject" });
    }
})

export default router;
