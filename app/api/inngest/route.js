import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import {
  CreateNewUser,
  GenerateAssignments,
  GenerateNotes,
  GenerateStudyTypeContent,
  GradeAssignment,
  CleanupStaleCourses,
  SendWeeklyProgressReminders,
  SystemHealthCheck,
  helloWorld,
} from "@/inngest/functions";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for Inngest operations

export const { GET, POST, PUT } = serve({
  client: inngest,
  streaming: "allow",
  functions: [
    helloWorld,
    CreateNewUser,
    GenerateNotes,
    GenerateStudyTypeContent,
    GradeAssignment,
    GenerateAssignments,
    SendWeeklyProgressReminders,
    CleanupStaleCourses,
    SystemHealthCheck,
  ],
});
