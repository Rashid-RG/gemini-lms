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

// Debug: Log the signing key availability when route is initialized
console.log('[INNGEST ROUTE] Route initialization - signing key config:', {
  INNGEST_SIGNING_KEY: Boolean(process.env.INNGEST_SIGNING_KEY),
  INNGEST_SIGNING_KEY_FALLBACK: Boolean(process.env.INNGEST_SIGNING_KEY_FALLBACK),
  INNGEST_BASE_URL: process.env.INNGEST_BASE_URL || 'default',
  INNGEST_DEV: process.env.INNGEST_DEV,
});

export const { GET, POST, PUT } = serve({
  client: inngest,
  streaming: "allow",
  skipSignatureValidation: process.env.NODE_ENV === "development",
  signingKey: process.env.INNGEST_SIGNING_KEY,
  signingKeyFallback: process.env.INNGEST_SIGNING_KEY_FALLBACK,
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
