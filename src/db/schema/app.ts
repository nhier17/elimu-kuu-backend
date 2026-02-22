import { relations } from "drizzle-orm";
import {
    integer,
    jsonb,
    index,
    pgEnum,
    pgTable,
    text,
    timestamp,
    varchar,
} from "drizzle-orm/pg-core";


//departments schema
export const departments = pgTable("departments" , {

});

//subjects schema
export const subjects = pgTable("subjects", {

});

//classes schema
export const classes = pgTable("classes", {

});

//enrollments schema
export const enrollments = pgTable("enrollments", {

});