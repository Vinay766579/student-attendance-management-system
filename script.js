/* =========================================================
   Student Attendance Management System - script.js
   Plain JavaScript + LocalStorage (no framework, no backend)
   ========================================================= */


/* =========================================================
   1. SETTINGS AND VARIABLES
   ========================================================= */

// Keys used to save data in the browser's LocalStorage
const STUDENTS_KEY   = "sams_students";
const ATTENDANCE_KEY = "sams_attendance";
const LOGIN_KEY      = "sams_loggedIn";

// Demo login details
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// Attendance below this percentage is "Low attendance"
const LOW_ATTENDANCE_LIMIT = 75;

// These arrays hold all our data while the app is running
let students = [];            // [{ id, name, roll, department, year }]
let attendanceRecords = [];   // [{ date, studentId, status }]

// Temporary marks on the "Mark Attendance" page, e.g. { 1: "Present", 2: "Absent" }
let currentMarks = {};

// When editing a student, this stores that student's id (otherwise null)
let editingStudentId = null;


/* =========================================================
   2. SMALL HELPER FUNCTIONS
   ========================================================= */

// Returns a date as text in the form "2026-10-08" (the format date inputs use)
function formatDate(dateObject) {
  const year  = dateObject.getFullYear();
  const month = String(dateObject.getMonth() + 1).padStart(2, "0");
  const day   = String(dateObject.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// Returns today's date as text
function getToday() {
  return formatDate(new Date());
}

// Shows a date like "08 Oct 2026" instead of "2026-10-08"
function formatDisplayDate(dateText) {
  const dateObject = new Date(dateText + "T00:00:00");
  return dateObject.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Makes text safe before putting it inside HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Finds a student using their id
function getStudentById(id) {
  return students.find(function (student) {
    return student.id === id;
  });
}

// Shows a small pop-up message for 2.5 seconds
function showMessage(text, isError) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.className = isError ? "toast error" : "toast";

  setTimeout(function () {
    toast.className = "toast hidden";
  }, 2500);
}


/* =========================================================
   3. LOCALSTORAGE (SAVE AND LOAD DATA)
   ========================================================= */

// Save students to LocalStorage (LocalStorage only stores text, so we use JSON.stringify)
function saveStudentsToStorage() {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
}

// Save attendance records to LocalStorage
function saveAttendanceToStorage() {
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendanceRecords));
}

// Load data when the app starts. If nothing is saved yet, create demo data.
function loadData() {
  const savedStudents   = localStorage.getItem(STUDENTS_KEY);
  const savedAttendance = localStorage.getItem(ATTENDANCE_KEY);

  if (savedStudents === null || savedAttendance === null) {
    createSampleData();
  } else {
    students = JSON.parse(savedStudents);         // text -> array
    attendanceRecords = JSON.parse(savedAttendance);
  }
}

// Sample (demo) data so the project can be shown immediately
function createSampleData() {
  students = [
    { id: 1, name: "Anu",    roll: "101", department: "CSE", year: "3rd Year" },
    { id: 2, name: "Ravi",   roll: "102", department: "CSE", year: "3rd Year" },
    { id: 3, name: "Priya",  roll: "103", department: "CSE", year: "3rd Year" },
    { id: 4, name: "Kiran",  roll: "104", department: "CSE", year: "3rd Year" },
    { id: 5, name: "Sneha",  roll: "105", department: "CSE", year: "3rd Year" },
    { id: 6, name: "Rahul",  roll: "106", department: "CSE", year: "3rd Year" },
    { id: 7, name: "Divya",  roll: "107", department: "CSE", year: "3rd Year" },
    { id: 8, name: "Arjun",  roll: "108", department: "CSE", year: "3rd Year" }
  ];

  // Demo attendance for the last 5 working days (Mon-Fri before today).
  // P = Present, A = Absent. Each text has 5 letters, one for each day.
  const demoPatterns = {
    1: "PPPPP",   // Anu   -> 100%
    2: "PPAPP",   // Ravi  -> 80%
    3: "PAPAP",   // Priya -> 60%
    4: "PPPPA",   // Kiran -> 80%
    5: "PPPPP",   // Sneha -> 100%
    6: "APAPA",   // Rahul -> 40%
    7: "PPPAP",   // Divya -> 80%
    8: "PPPPP"    // Arjun -> 100%
  };

  const pastDays = getLastWorkingDays(5);
  attendanceRecords = [];

  pastDays.forEach(function (date, dayIndex) {
    students.forEach(function (student) {
      const letter = demoPatterns[student.id][dayIndex];
      attendanceRecords.push({
        date: date,
        studentId: student.id,
        status: letter === "P" ? "Present" : "Absent"
      });
    });
  });

  saveStudentsToStorage();
  saveAttendanceToStorage();
}

// Returns the last N weekdays (not including today), oldest first
function getLastWorkingDays(count) {
  const days = [];
  const day = new Date();

  while (days.length < count) {
    day.setDate(day.getDate() - 1);          // go back one day
    const weekDay = day.getDay();            // 0 = Sunday, 6 = Saturday
    if (weekDay !== 0 && weekDay !== 6) {
      days.unshift(formatDate(day));         // add to the front
    }
  }
  return days;
}


/* =========================================================
   4. LOGIN AND LOGOUT
   ========================================================= */

function handleLogin(event) {
  event.preventDefault();   // stop the page from reloading

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    localStorage.setItem(LOGIN_KEY, "yes");   // remember login after refresh
    document.getElementById("login-error").textContent = "";
    openApp();
  } else {
    document.getElementById("login-error").textContent = "Wrong username or password.";
  }
}

function handleLogout() {
  localStorage.removeItem(LOGIN_KEY);
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("app").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
}

// Hides the login screen and shows the main application
function openApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  showPage("dashboard");
}


/* =========================================================
   5. NAVIGATION (SIDEBAR AND PAGES)
   ========================================================= */

const pageTitles = {
  dashboard:  "Dashboard",
  students:   "Student Management",
  mark:       "Mark Attendance",
  records:    "Attendance Records",
  percentage: "Attendance Percentage"
};

// Shows one page and hides all the others
function showPage(pageName) {
  // hide every page
  document.querySelectorAll(".page").forEach(function (page) {
    page.classList.add("hidden");
  });

  // show the selected page
  document.getElementById("page-" + pageName).classList.remove("hidden");

  // highlight the correct sidebar button
  document.querySelectorAll(".nav-btn[data-page]").forEach(function (button) {
    if (button.dataset.page === pageName) {
      button.classList.add("active");
    } else {
      button.classList.remove("active");
    }
  });

  document.getElementById("page-title").textContent = pageTitles[pageName];

  // close the sidebar on mobile
  document.getElementById("sidebar").classList.remove("open");

  // When opening the Mark Attendance page, load marks for the selected date
  if (pageName === "mark") {
    loadMarksForDate();
  }

  renderAll();
}

// Opens/closes the sidebar on mobile
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}


/* =========================================================
   6. ATTENDANCE CALCULATIONS
   ========================================================= */

// Total working days = number of different dates in the attendance records
function getTotalWorkingDays() {
  const uniqueDates = [];
  attendanceRecords.forEach(function (record) {
    if (!uniqueDates.includes(record.date)) {
      uniqueDates.push(record.date);
    }
  });
  return uniqueDates.length;
}

// Number of days a student was Present
function getPresentDays(studentId) {
  return attendanceRecords.filter(function (record) {
    return record.studentId === studentId && record.status === "Present";
  }).length;
}

// Attendance Percentage = (Present Days / Total Working Days) x 100
function calculatePercentage(studentId) {
  const totalDays = getTotalWorkingDays();
  if (totalDays === 0) {
    return 0;   // avoid dividing by zero
  }
  return (getPresentDays(studentId) / totalDays) * 100;
}

// Average of all students' percentages
function calculateAveragePercentage() {
  if (students.length === 0) {
    return 0;
  }
  let sum = 0;
  students.forEach(function (student) {
    sum += calculatePercentage(student.id);
  });
  return sum / students.length;
}


/* =========================================================
   7. DASHBOARD
   ========================================================= */

function renderDashboard() {
  const today = getToday();

  // Records that belong to today
  const todayRecords = attendanceRecords.filter(function (record) {
    return record.date === today;
  });

  const presentToday = todayRecords.filter(function (r) { return r.status === "Present"; }).length;
  const absentToday  = todayRecords.filter(function (r) { return r.status === "Absent"; }).length;
  const notMarked    = students.length - presentToday - absentToday;

  document.getElementById("stat-total").textContent   = students.length;
  document.getElementById("stat-present").textContent = presentToday;
  document.getElementById("stat-absent").textContent  = absentToday;
  document.getElementById("stat-average").textContent = Math.round(calculateAveragePercentage()) + "%";

  // A small note under the cards
  const note = document.getElementById("today-note");
  if (todayRecords.length === 0) {
    note.textContent = "Today's attendance is not marked yet. Go to Mark Attendance to mark it.";
  } else if (notMarked > 0) {
    note.textContent = notMarked + " student(s) not marked today.";
  } else {
    note.textContent = "Today's attendance is marked for all students.";
  }

  renderChart();
}

// Simple bar chart made with HTML/CSS (no chart library needed)
function renderChart() {
  const chart = document.getElementById("chart");

  if (students.length === 0) {
    chart.innerHTML = '<p class="muted">No students to show.</p>';
    return;
  }

  let html = "";
  students.forEach(function (student) {
    const percent = Math.round(calculatePercentage(student.id));
    const barClass = percent >= LOW_ATTENDANCE_LIMIT ? "good" : "low";

    html += '<div class="chart-row">' +
              '<span>' + escapeHtml(student.name) + '</span>' +
              '<div class="chart-track"><div class="chart-bar ' + barClass + '" style="width:' + percent + '%"></div></div>' +
              '<span class="chart-value">' + percent + '%</span>' +
            '</div>';
  });

  chart.innerHTML = html;
}


/* =========================================================
   8. STUDENT MANAGEMENT (ADD, EDIT, DELETE, SEARCH)
   ========================================================= */

// Runs when the student form is submitted (for both Add and Update)
function handleStudentSubmit(event) {
  event.preventDefault();

  const name       = document.getElementById("student-name").value.trim();
  const roll       = document.getElementById("student-roll").value.trim();
  const department = document.getElementById("student-department").value.trim();
  const year       = document.getElementById("student-year").value;

  // Simple validation
  if (name === "" || roll === "" || department === "") {
    showMessage("Please fill in name, roll number and department.", true);
    return;
  }

  // Roll number must be unique (ignore the student we are editing)
  const rollAlreadyUsed = students.some(function (student) {
    return student.roll === roll && student.id !== editingStudentId;
  });
  if (rollAlreadyUsed) {
    showMessage("This roll number already exists.", true);
    return;
  }

  if (editingStudentId === null) {
    // ----- ADD a new student -----
    let newId = 1;
    students.forEach(function (student) {
      if (student.id >= newId) {
        newId = student.id + 1;     // new id = highest id + 1
      }
    });

    students.push({ id: newId, name: name, roll: roll, department: department, year: year });
    showMessage("Student added.");
  } else {
    // ----- UPDATE an existing student -----
    const student = getStudentById(editingStudentId);
    student.name = name;
    student.roll = roll;
    student.department = department;
    student.year = year;
    showMessage("Student updated.");
  }

  saveStudentsToStorage();
  resetStudentForm();
  renderAll();
}

// Fills the form with the student's details so they can be edited
function editStudent(id) {
  const student = getStudentById(id);
  editingStudentId = id;

  document.getElementById("student-name").value       = student.name;
  document.getElementById("student-roll").value       = student.roll;
  document.getElementById("student-department").value = student.department;
  document.getElementById("student-year").value       = student.year;

  document.getElementById("student-form-title").textContent = "Edit Student";
  document.getElementById("student-submit-btn").textContent = "Update Student";
  document.getElementById("student-cancel-btn").classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelEdit() {
  resetStudentForm();
}

// Clears the form and goes back to "Add Student" mode
function resetStudentForm() {
  editingStudentId = null;

  document.getElementById("student-name").value = "";
  document.getElementById("student-roll").value = "";
  document.getElementById("student-department").value = "";
  document.getElementById("student-year").value = "3rd Year";

  document.getElementById("student-form-title").textContent = "Add Student";
  document.getElementById("student-submit-btn").textContent = "Add Student";
  document.getElementById("student-cancel-btn").classList.add("hidden");
}

// Deletes a student and also that student's attendance records
function deleteStudent(id) {
  const student = getStudentById(id);
  const sure = confirm("Delete " + student.name + " and all of their attendance records?");
  if (!sure) {
    return;
  }

  students = students.filter(function (s) { return s.id !== id; });
  attendanceRecords = attendanceRecords.filter(function (r) { return r.studentId !== id; });

  saveStudentsToStorage();
  saveAttendanceToStorage();

  if (editingStudentId === id) {
    resetStudentForm();
  }

  showMessage("Student deleted.");
  renderAll();
}

// Draws the student table (also used for searching)
function renderStudentTable() {
  const searchText = document.getElementById("student-search").value.trim().toLowerCase();

  // Keep only students that match the search text
  const filteredStudents = students.filter(function (student) {
    return student.name.toLowerCase().includes(searchText) ||
           student.roll.toLowerCase().includes(searchText) ||
           student.department.toLowerCase().includes(searchText);
  });

  const tbody = document.getElementById("student-table-body");

  if (filteredStudents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No students found.</td></tr>';
    return;
  }

  let html = "";
  filteredStudents.forEach(function (student) {
    html += "<tr>" +
              "<td>" + escapeHtml(student.roll) + "</td>" +
              "<td>" + escapeHtml(student.name) + "</td>" +
              "<td>" + escapeHtml(student.department) + "</td>" +
              "<td>" + escapeHtml(student.year) + "</td>" +
              '<td class="actions">' +
                '<button class="btn btn-small btn-edit" onclick="editStudent(' + student.id + ')">Edit</button>' +
                '<button class="btn btn-small btn-delete" onclick="deleteStudent(' + student.id + ')">Delete</button>' +
              "</td>" +
            "</tr>";
  });
  tbody.innerHTML = html;
}


/* =========================================================
   9. MARK ATTENDANCE
   ========================================================= */

// Loads already-saved marks for the selected date (if any)
function loadMarksForDate() {
  const dateInput = document.getElementById("attendance-date");

  if (dateInput.value === "") {
    dateInput.value = getToday();   // default date = today
  }

  currentMarks = {};
  attendanceRecords.forEach(function (record) {
    if (record.date === dateInput.value) {
      currentMarks[record.studentId] = record.status;
    }
  });

  renderMarkTable();
}

// Sets one student's mark (called by the Present / Absent buttons)
function setMark(studentId, status) {
  currentMarks[studentId] = status;
  renderMarkTable();
}

// Marks every student the same way
function markAll(status) {
  students.forEach(function (student) {
    currentMarks[student.id] = status;
  });
  renderMarkTable();
}

// Draws the table with Present / Absent buttons
function renderMarkTable() {
  const tbody = document.getElementById("mark-table-body");

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Add students first.</td></tr>';
    return;
  }

  let html = "";
  students.forEach(function (student) {
    const status = currentMarks[student.id];   // "Present", "Absent" or undefined

    // Badge showing the current status
    let badge = '<span class="badge badge-none">Not marked</span>';
    if (status === "Present") {
      badge = '<span class="badge badge-present">Present</span>';
    } else if (status === "Absent") {
      badge = '<span class="badge badge-absent">Absent</span>';
    }

    const presentClass = status === "Present" ? "btn btn-small btn-present selected" : "btn btn-small btn-present";
    const absentClass  = status === "Absent"  ? "btn btn-small btn-absent selected"  : "btn btn-small btn-absent";

    html += "<tr>" +
              "<td>" + escapeHtml(student.roll) + "</td>" +
              "<td>" + escapeHtml(student.name) + "</td>" +
              "<td>" + badge + "</td>" +
              '<td class="mark-buttons">' +
                '<button class="' + presentClass + '" onclick="setMark(' + student.id + ', \'Present\')">Present</button>' +
                '<button class="' + absentClass  + '" onclick="setMark(' + student.id + ', \'Absent\')">Absent</button>' +
              "</td>" +
            "</tr>";
  });
  tbody.innerHTML = html;
}

// Saves the marked attendance for the selected date
function saveAttendance() {
  const date = document.getElementById("attendance-date").value;

  if (date === "") {
    showMessage("Please select a date.", true);
    return;
  }
  if (students.length === 0) {
    showMessage("Add students first.", true);
    return;
  }

  // Every student must be marked
  const unmarked = students.filter(function (student) {
    return currentMarks[student.id] === undefined;
  });
  if (unmarked.length > 0) {
    showMessage("Please mark all students (" + unmarked.length + " not marked).", true);
    return;
  }

  // Remove old records of this date, then add the new ones
  attendanceRecords = attendanceRecords.filter(function (record) {
    return record.date !== date;
  });

  students.forEach(function (student) {
    attendanceRecords.push({
      date: date,
      studentId: student.id,
      status: currentMarks[student.id]
    });
  });

  saveAttendanceToStorage();
  showMessage("Attendance saved for " + formatDisplayDate(date) + ".");
  renderAll();
}


/* =========================================================
   10. ATTENDANCE RECORDS (HISTORY AND FILTERS)
   ========================================================= */

// Fills the "Filter by Student" drop-down
function fillStudentFilter() {
  const select = document.getElementById("filter-student");
  const selectedValue = select.value;   // remember current choice

  let html = '<option value="all">All Students</option>';
  students.forEach(function (student) {
    html += '<option value="' + student.id + '">' + escapeHtml(student.roll) + " - " + escapeHtml(student.name) + "</option>";
  });
  select.innerHTML = html;

  // Put the previous choice back if that student still exists
  if (selectedValue !== "" && getStudentById(Number(selectedValue))) {
    select.value = selectedValue;
  }
}

function renderRecordsTable() {
  const filterDate    = document.getElementById("filter-date").value;
  const filterStudent = document.getElementById("filter-student").value;

  // Apply the filters
  let filtered = attendanceRecords.filter(function (record) {
    const dateMatches    = filterDate === "" || record.date === filterDate;
    const studentMatches = filterStudent === "all" || filterStudent === "" || record.studentId === Number(filterStudent);
    return dateMatches && studentMatches;
  });

  // Newest date first
  filtered.sort(function (a, b) {
    if (a.date < b.date) return 1;
    if (a.date > b.date) return -1;
    return 0;
  });

  const tbody = document.getElementById("records-table-body");

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-row">No attendance records found.</td></tr>';
    return;
  }

  let html = "";
  filtered.forEach(function (record) {
    const student = getStudentById(record.studentId);
    if (!student) {
      return;   // skip if the student no longer exists
    }

    const badgeClass = record.status === "Present" ? "badge-present" : "badge-absent";

    html += "<tr>" +
              "<td>" + formatDisplayDate(record.date) + "</td>" +
              "<td>" + escapeHtml(student.roll) + "</td>" +
              "<td>" + escapeHtml(student.name) + "</td>" +
              '<td><span class="badge ' + badgeClass + '">' + record.status + "</span></td>" +
            "</tr>";
  });
  tbody.innerHTML = html;
}

function clearFilters() {
  document.getElementById("filter-date").value = "";
  document.getElementById("filter-student").value = "all";
  renderRecordsTable();
}


/* =========================================================
   11. ATTENDANCE PERCENTAGE PAGE
   ========================================================= */

function renderPercentageTable() {
  const tbody = document.getElementById("percentage-table-body");
  const totalDays = getTotalWorkingDays();

  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-row">No students found.</td></tr>';
    return;
  }

  let html = "";
  students.forEach(function (student) {
    const presentDays = getPresentDays(student.id);
    const percent = Math.round(calculatePercentage(student.id));
    const isGood = percent >= LOW_ATTENDANCE_LIMIT;

    const barClass   = isGood ? "good" : "low";
    const badgeClass = isGood ? "badge-good" : "badge-low";
    const statusText = isGood ? "Good attendance" : "Low attendance";

    html += "<tr>" +
              "<td>" + escapeHtml(student.roll) + "</td>" +
              "<td>" + escapeHtml(student.name) + "</td>" +
              "<td>" + presentDays + "</td>" +
              "<td>" + totalDays + "</td>" +
              '<td><div class="percent-cell">' +
                  "<strong>" + percent + "%</strong>" +
                  '<div class="chart-track"><div class="chart-bar ' + barClass + '" style="width:' + percent + '%"></div></div>' +
              "</div></td>" +
              '<td><span class="badge ' + badgeClass + '">' + statusText + "</span></td>" +
            "</tr>";
  });
  tbody.innerHTML = html;
}


/* =========================================================
   12. REFRESH EVERYTHING + START THE APP
   ========================================================= */

// Redraws every part of the screen so all numbers and tables stay up to date
function renderAll() {
  renderDashboard();
  renderStudentTable();
  renderMarkTable();
  fillStudentFilter();
  renderRecordsTable();
  renderPercentageTable();
}

// This runs once when the page opens
function startApp() {
  loadData();                                            // load (or create) data
  document.getElementById("attendance-date").value = getToday();

  // If the teacher was already logged in, skip the login screen
  if (localStorage.getItem(LOGIN_KEY) === "yes") {
    openApp();
  }
}

startApp();
