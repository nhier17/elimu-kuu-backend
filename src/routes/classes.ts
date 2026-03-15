import express from "express";
import { eq, ilike, or, and, desc, sql, getTableColumns } from "drizzle-orm";

import { db } from "../db";
import { subjects, classes, user, departments, enrollments } from "../db/schema";

const router = express.Router();

//get all classes with optional search, subject filter, teacher filter and pagination
router.get("/", async (req, res) => {
    try {
        const { search, subject, teacher, page = 1, limit = 10 } = req.query;

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 1), 100);
        const offset = (currentPage - 1) * limitPerPage;

        const filterConditions = [];

        if (search) {
            filterConditions.push(
                or(
                    ilike(classes.name, `%${search}%`),
                    ilike(classes.inviteCode, `%${search}%`)
                )
            );
        }

        if (subject) {
            const subjectPattern = `%${String(subject).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(ilike(subjects.name, subjectPattern));
        }

        if (teacher) {
            const teacherPattern = `%${String(teacher).replace(/[%_]/g, '\\$&')}%`;
            filterConditions.push(ilike(user.name, teacherPattern));
        }

        const whereClause =
            filterConditions.length > 0 ? and(...filterConditions) : undefined;

        // Count query MUST include the join
        const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause);

        const totalCount = Number(countResult[0]?.count ?? 0);

        // Data query
        const classesList = await db
            .select({
                ...getTableColumns(classes),
                subject: {
                    ...getTableColumns(subjects),
                },
                teacher: {
                    ...getTableColumns(user),
                },
            })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(whereClause)
            .orderBy(desc(classes.createdAt))
            .limit(limitPerPage)
            .offset(offset);

        res.status(200).json({
            data: classesList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            },
        });
    } catch (error) {
        console.error("GET /classes error:", error);
        res.status(500).json({ error: "Failed to fetch classes" });
    }
});

router.post("/", async (req, res) => {
    try {
        const [createdClass] = await db
            .insert(classes)
            .values({
                ...req.body,
                inviteCode: Math.random().toString(36).substring(2, 9),
                schedule: []
            })
            .returning({ id: classes.id });

        if (!createdClass) throw Error;

        res.status(201).json({ data: createdClass });
    } catch (error) {
        console.error("POST /classes", error);
        res.status(500).json({ error: "Failed to create class" });
    }
});

//get a class by id
router.get("/:id", async (req, res) => {
    try {
        const classId = Number(req.params.id);

        if(!Number.isFinite(classId)) {
            return res.status(400).json({ error: "Invalid class ID" });
        }

        const [classDetails] = await db
            .select({
                ...getTableColumns(classes),
                subject: {
                    ...getTableColumns(subjects),
                },
                teacher: {
                    ...getTableColumns(user),
                },
            })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .leftJoin(departments, eq(subjects.departmentId, departments.id))
            .leftJoin(user, eq(classes.teacherId, user.id))
            .where(eq(classes.id, classId))


        if (!classDetails) {
            return res.status(404).json({ error: "Class not found" });
        }

        res.status(200).json({ data: classDetails });

    } catch (error) {
        console.error("GET /classes/:id error:", error);
        res.status(500).json({ error: "Failed to fetch class" });
    }
});

//list users in a class by role
router.get("/:id/users", async (req, res) => {
    try {
        const classId = Number(req.params.id);
        const { role, page = 1, limit = 10 } = req.query;

        if(!Number.isFinite(classId)) {
            return res.status(400).json({ error: "Invalid class ID" });
        }

        if(role !== "teacher" && role !== "student") {
            return res.status(400).json({ error: "Invalid role" });
        }

        const currentPage = Math.max(1, parseInt(String(page), 10) || 1);
        const limitPerPage = Math.min(Math.max(1, parseInt(String(limit), 10) || 1), 100);
        const offset = (currentPage - 1) * limitPerPage;

        const baseSelect = {
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            role: user.role,
            imageCldPubId: user.imageCldPubId,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        const groupByFields = [
            user.id,
            user.name,
            user.email,
            user.emailVerified,
            user.image,
            user.role,
            user.imageCldPubId,
            user.createdAt,
            user.updatedAt,
        ];

        const countResult =
            role === "teacher"
                ? await db
                    .select({ count: sql<number>`count(distinct ${user.id})` })
                    .from(user)
                    .leftJoin(classes, eq(user.id, classes.teacherId))
                    .where(and(eq(user.role, role), eq(classes.id, classId)))
                : await db
                    .select({ count: sql<number>`count(distinct ${user.id})` })
                    .from(user)
                    .leftJoin(enrollments, eq(user.id, enrollments.studentId))
                    .where(and(eq(user.role, role), eq(enrollments.classId, classId)));

        const totalCount = countResult[0]?.count ?? 0;

        const userList =
            role === "teacher"
                ? await db
                .select(baseSelect)
                .from(user)
                .leftJoin(classes, eq(user.id, classes.teacherId))
                    .where(and(eq(user.role, role), eq(classes.id, classId)))
                .groupBy(...groupByFields)
                .orderBy(desc(user.createdAt))
                .limit(limitPerPage)
                .offset(offset)
                : await db
                    .select(baseSelect)
                    .from(user)
                    .leftJoin(enrollments, eq(user.id, enrollments.studentId))
                    .where(and(eq(user.role, role), eq(enrollments.classId, classId)))
                    .groupBy(...groupByFields)
                    .orderBy(desc(user.createdAt))
                    .limit(limitPerPage)
                    .offset(offset);

        res.status(200).json({
            data: userList,
            pagination: {
                page: currentPage,
                limit: limitPerPage,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limitPerPage),
            },
        });

    } catch (error) {
        console.error("GET /classes/:id/users error:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
})

export default router;
