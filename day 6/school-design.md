# School Database Design

## 1. Tables and Entities

### Students

The students table stores information about each student. It contains student_id, name, and email. The student_id is the primary key that uniquely identifies each student. The name and email are required, and the email must be unique.

### Courses

The courses table stores information about the courses offered by the school. It contains course_id and course_name. The course_id is the primary key, and the course name is required and unique.

### Enrolments

The enrolments table records which students are enrolled in which courses. It contains enrolment_id, student_id, course_id, and grade. The enrolment_id is the primary key. The student_id and course_id are foreign keys that reference the students and courses tables. The grade stores the student's result for that course. A unique constraint on student_id and course_id prevents the same student from enrolling in the same course more than once.

## 2. Relationships

There is a one-to-many relationship between students and enrolments because one student can have multiple enrolment records, but each enrolment belongs to one student. There is also a one-to-many relationship between courses and enrolments because one course can have multiple students enrolled, but each enrolment refers to one course.

Students and courses have a many-to-many relationship because one student can take multiple courses, and each course can have multiple students. The enrolments table acts as a join table between students and courses. It resolves the many-to-many relationship and stores additional information about each enrolment, such as the grade.

## 3. Recommended Index

I would add an index on enrolments(course_id) to improve queries that search for students enrolled in a particular course or count enrolments for each course. This index can help SQLite find matching enrolment records more efficiently as the database grows. The unique constraint on student_id and course_id already creates an index to enforce the rule against duplicate enrolments.

## 4. SQL or NoSQL?

I would choose SQL for this school database because the data is structured and has clear relationships between students, courses, and enrolments. A relational database such as SQLite supports primary keys, foreign keys, unique constraints, and joins, which help maintain data accuracy and prevent invalid enrolments. SQL also makes it straightforward to count students per course, find students without enrolments, and update grades. NoSQL could be useful for flexible or unstructured data, but SQL is a better fit for this system because its data and relationships are well defined.
Step 3: Check your files in Antigravity
Your folder should look like this:

text
your-project/
└── day6/
├── school.sql
└── school-design.md
