const { google } = require("googleapis");

async function setGrades(students, numberOfClasses) {
    const grades = [];
    console.log("Calculating grades...");
    // For each student, calculates their average, defines their status and the grade needed for approval, according to the challenge rules
    for (const student of students) {
        const absences = student.absences;
        const p1 = student.p1;
        const p2 = student.p2;
        const p3 = student.p3;

        const average = (p1 + p2 + p3) / 3;
        student.gradeToBeApproved = 0;

        if (absences > numberOfClasses * 0.25) {
            student.status = "Reprovado por Falta";
        } else if (average < 50) {
            student.status = "Reprovado por Nota";
        } else if (average < 70) {
            student.status = "Exame Final";
            student.gradeToBeApproved = 100 - average;
            student.gradeToBeApproved = Math.round(student.gradeToBeApproved);
        } else {
            student.status = "Aprovado";
        }
        grades.push([
            student.status,
            student.gradeToBeApproved
        ]);
    }
    return grades;
}

async function main() {
    try {
        // Creates the authentication object
        const auth = new google.auth.GoogleAuth({
            keyFile: "credentials.json",
            scopes: "https://www.googleapis.com/auth/spreadsheets",
        });

        // Creates the authenticated client
        const client = await auth.getClient();

        // Instantiates the Google Sheets API
        const googleSheets = google.sheets({ version: 'v4', client });

        const spreadsheetId = "110a6ODFdYAWA0wSQUVDtu5ebNAXpyYiL9ZXe88UNc40";

        console.log("Fetching spreadsheet data...");

        // Fetches the spreadsheet metadata
        const metaData = await googleSheets.spreadsheets.get({
            auth,
            spreadsheetId,
        });

        // Fetches the total number of classes taught
        const getNumberOfClasses = await googleSheets.spreadsheets.values.get(
            {
                auth,
                spreadsheetId,
                range: "engenharia_de_software!A2",
            }
        );
        // Collects the number of classes and then converts it to an integer
        const stringNumberOfClasses = getNumberOfClasses.data.values[0][0];
        const numberOfClasses = parseInt(stringNumberOfClasses.split(": ")[1]);

        // Fetches the students data
        const getStudents = await googleSheets.spreadsheets.values.get({
            auth,
            spreadsheetId,
            range: "engenharia_de_software!A4:F27",
        });

        if (!getStudents || !getStudents.data || !getStudents.data.values) {
            throw new Error("Failed to fetch students data from the spreadsheet.");
        } else {
            console.log("Spreadsheet data fetched successfully!");
        }

        const students = [];

        // Converts the students data into a Students object
        getStudents.data.values.forEach(row => {
            students.push({
                id: parseInt(row[0]),
                name: row[1],
                absences: parseInt(row[2]),
                p1: parseInt(row[3]),
                p2: parseInt(row[4]),
                p3: parseInt(row[5])
            });
        });

        // Calculates the grades and the students status
        const grades = await setGrades(students, numberOfClasses);

        if (!grades) {
            throw new Error("Failed to calculate grades for students.");
        } else {
            console.log("Grades calculated successfully!");
        }

        // Updates the grades and the students status in the spreadsheet
        googleSheets.spreadsheets.values.update({
            auth,
            spreadsheetId,
            includeValuesInResponse: true,
            range: "engenharia_de_software!G4:H27",
            valueInputOption: "USER_ENTERED",
            resource: { values: grades },
        });

        console.log("Grades and students status updated successfully!");
        console.log({students});
    } catch (error) {
        console.error("An error occurred:", error.message);
    }
}

main();
