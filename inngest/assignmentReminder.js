import { db } from "../configs/db";
import { COURSE_ASSIGNMENTS_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE, USER_TABLE } from "../configs/schema";
import { inngest } from "./client";
import { Resend } from "resend";

// This function runs daily to check for assignments due in 3 days and sends reminders
export const AssignmentReminder = inngest.createFunction(
  { id: "assignment-reminder", retries: 1 },
  { event: "assignment.reminder" },
  async ({ step }) => {
    // Find assignments due in 3 days
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 3);
    const assignments = await db.select().from(COURSE_ASSIGNMENTS_TABLE);
    for (const assignment of assignments) {
      if (!assignment.dueDate) continue;
      const dueDate = new Date(assignment.dueDate);
      if (dueDate > now && dueDate <= soon) {
        // Find students who have not submitted
        const submissions = await db.select().from(ASSIGNMENT_SUBMISSIONS_TABLE)
          .where({ assignmentId: assignment.assignmentId });
        const submittedEmails = submissions.map(s => s.studentEmail);
        // Find all users in USER_TABLE (or use enrolledUsers if available)
        // For demo, send to all users who have not submitted
        const users = await db.select().from(USER_TABLE);
        for (const user of users) {
          if (!submittedEmails.includes(user.email)) {
            // Send email reminder
            await Resend.emails.send({
              to: user.email,
              subject: `Assignment Due Soon: ${assignment.title}`,
              html: `<p>Your assignment <b>${assignment.title}</b> is due on ${dueDate.toLocaleDateString()}. Please submit before the deadline.</p>`
            });
            // Send in-app notification (pseudo-code, replace with your notification system)
            // await sendInAppNotification(user.email, `Assignment '${assignment.title}' is due in 3 days!`);
          }
        }
      }
    }
    return { success: true };
  }
);