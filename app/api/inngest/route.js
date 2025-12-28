import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import { CreateNewUser, GenerateNotes, GenerateStudyTypeContent, GradeAssignment, GenerateAssignments, helloWorld } from "@/inngest/functions";
import { SubscriptionCancelledEmail } from "@/inngest/subscription-cancellation";
// Note: Removed 'edge' runtime - Inngest requires Node.js runtime for full functionality
export const maxDuration = 60; // Allow up to 60 seconds for Inngest operations
// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  streaming:'allow',
  functions: [
    /* your functions will be passed here later! */
    helloWorld,
    CreateNewUser,
    GenerateNotes,
    GenerateStudyTypeContent,
    GradeAssignment,
    GenerateAssignments,
    SubscriptionCancelledEmail
  ],
});
