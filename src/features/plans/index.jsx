import TeacherPlans from "./TeacherPlans.jsx";
import StudentPlans from "./StudentPlans.jsx";

// Branch by role: teachers get the send UI + history, students get their live
// plans + progress editing.
export default function Plans({ uid, profile, isTeacher }) {
  return isTeacher ? (
    <TeacherPlans uid={uid} profile={profile} />
  ) : (
    <StudentPlans uid={uid} />
  );
}
