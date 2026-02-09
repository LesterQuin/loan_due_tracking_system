// pastDueController.js
import * as Report from '../../models/pastDueModel/pastDueModel.js';
import xlsx from 'xlsx';

export const uploadExcel = async (req, res) => {
    try {
        if (!req.file) 
            return res.status(400).json({ message: 'Excel file required.' });

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Read everything as an array of arrays
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        const headers = data[1].map(h => String(h).trim());
        const rows = data.slice(2); // skip metadata + header

        const jsonData = rows.map((row) => {
            const obj = {};
            headers.forEach((h, i) => obj[h] = row[i]);
            return obj;
        });

        // Get current date as string
        const reportAsOf = new Date().toLocaleDateString('en-US'); // e.g., 2/6/2026

        // Dynamically pick the last 4 columns for interest/discount & discounted ORB
        const dynamicHeaders = headers.slice(-4);
        const [interestDiscount1Header, interestDiscount2Header, discountedOrb1Header, discountedOrb2Header] = dynamicHeaders;

        console.log('Detected headers:', headers);
        console.log('Total rows from Excel (excluding header):', jsonData.length);

        // Map to your DB columns, store all dates as strings
        const reports = jsonData.map((row) => ({
            loan_account_no: row['LOAN ACCOUNT NO.'] ? String(row['LOAN ACCOUNT NO.']).trim() : null,
            disb_date: typeof row['DISB DATE'] === 'number' ? excelDateToJSDate(row['DISB DATE']) : (row['DISB DATE'] ? String(row['DISB DATE']).trim() : null),
            funder: row['FUNDER'] || null,              
            tcaa: row['TCAA'] || null,                  
            written_off: row['WRITTEN OFF'] || null,
            smrd_coll_agency: row['SMRD (COLL AGENCY)'] || null,
            region: row['REGION'] || null,
            company: row['COMPANY'] || null,
            division_no: row['DIVISION NO.'] || null,
            station_no: row['STATION NO.'] || null,
            employee_id: row['EMPLOYEE ID'] ? String(row['EMPLOYEE ID']).trim() : null,
            client_name: row['CLIENT NAME'] || null,
            pn_value: row['PN VALUE'] ? Number(String(row['PN VALUE']).replace(/,/g, '')) : 0,
            principal_value: row['PRINCIPAL VALUE'] ? Number(String(row['PRINCIPAL VALUE']).replace(/,/g, '')) : 0,
            amort_amt: row['AMORT AMT'] ? Number(String(row['AMORT AMT']).replace(/,/g, '')) : 0,
            out_prin_bal: row['OUT PRIN BAL'] ? Number(String(row['OUT PRIN BAL']).replace(/,/g, '')) : 0,
            last_payment_date: row['LAST PYMNT. DATE'] ? String(row['LAST PYMNT. DATE']).trim() : null,
            first_due_date: row['FIRST DUE DATE'] ? String(row['FIRST DUE DATE']).trim() : null,
            maturity_date: row['MATURITY'] ? String(row['MATURITY']).trim() : null,
            past_due: row['(A) PAST DUE'] ? Number(String(row['(A) PAST DUE']).replace(/,/g, '')) : 0,
            orb: row['(B) ORB'] ? Number(String(row['(B) ORB']).replace(/,/g, '')) : 0,
            nfc: row['(C) NFC'] ? Number(String(row['(C) NFC']).replace(/,/g, '')) : 0,
            penalty: row['(D) PENALTY'] ? Number(String(row['(D) PENALTY']).replace(/,/g, '')) : 0,
            total_orb: row['(E) TOTAL ORB'] ? Number(String(row['(E) TOTAL ORB']).replace(/,/g, '')) : 0,
            interest_discount_1: interestDiscount1Header ? Number(String(row[interestDiscount1Header]).replace(/,/g, '')) : 0,
            interest_discount_2: interestDiscount2Header ? Number(String(row[interestDiscount2Header]).replace(/,/g, '')) : 0,
            discounted_orb_1: discountedOrb1Header ? Number(String(row[discountedOrb1Header]).replace(/,/g, '')) : 0,
            discounted_orb_2: discountedOrb2Header ? Number(String(row[discountedOrb2Header]).replace(/,/g, '')) : 0,
            report_as_of: reportAsOf 
        }))
        .filter(r => r.loan_account_no); // remove rows with missing loan_account_no

        console.log('Total valid reports after mapping:', reports.length);

        // Insert into DB in chunks
        const chunkSize = 500;
        for (let i = 0; i < reports.length; i += chunkSize) {
            const chunk = reports.slice(i, i + chunkSize);
            await Report.insertReports(chunk);
        }

        res.json({ message: `Excel data imported successfully. Total rows: ${reports.length}` });

    } catch (err) {
        console.error('UPLOAD ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Convert Excel String to "MM/DD/YYYY"
function excelDateToJSDate(serial) {
    if (!serial) return null;
    if (typeof serial === 'string') 
        return serial.trim();

    const utc_days = serial - 25569; 
    const utc_value = utc_days * 86400; 
    const date_info = new Date(utc_value * 1000);
    const month = (date_info.getMonth() + 1).toString().padStart(2, '0');
    const day = date_info.getDate().toString().padStart(2, '0');
    const year = date_info.getFullYear();
    return `${month}/${day}/${year}`; 
}

export const exportExcel = async (req, res) => {
    try {
        console.log('[EXPORT] Starting export process...');

        const reports = await Report.getReports();
        console.log(`[EXPORT] Reports fetched from DB: ${reports.length}`);

        if (!reports.length) {
            console.log('[EXPORT] No reports found, sending 404');
            return res.status(404).json({ message: 'No reports found.' });
        }

        // Convert to worksheet
        const worksheet = xlsx.utils.json_to_sheet(reports);
        console.log('[EXPORT] Worksheet created');

        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'PastDueReports');
        console.log('[EXPORT] Workbook created and worksheet appended');

        // Generate buffer
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        console.log('[EXPORT] Excel buffer generated');

        res.setHeader('Content-Disposition', 'attachment; filename=past_due_reports.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        console.log('[EXPORT] Sending response...');
        res.send(buffer);

        console.log('[EXPORT] Export finished successfully');

    } catch (err) {
        console.error('[EXPORT ERROR]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Admin view
export const getAdminReports = async (req, res) => {
    try {
        const reports = await Report.getAllReports();
        console.log('[ADMIN VIEW] Records fetched:', reports.length);

        res.json({
            message: 'Admin reports fetched successfully',
            data: reports
        });
    } catch (err) {
        console.error('[ADMIN VIEW] ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Department view
export const getDepartmentReports = async (req, res) => {
    try {
        const { departmentId } = req.user; // set from JWT
        const reports = await Report.getReportsByDepartment(departmentId);

        console.log('[DEPARTMENT VIEW] Records fetched:', reports.length);

        res.json({
            message: 'Department reports fetched successfully',
            data: reports
        });
    } catch (err) {
        console.error('[DEPARTMENT VIEW] ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

export const getLoanDueDetails = async (req, res) => {
    try {
        const { filterBy, agentCode } = req.query;

        if (!filterBy || !agentCode) {
            return res.status(400).json({ message: 'filterBy and agentCode are required' });
        }

        // Call the model function
        const data = await Report.getLoanDueDetails(filterBy, agentCode);

        res.json({
            message: 'Loan due details fetched successfully',
            data
        });

    } catch (err) {
        console.error('[CONTROLLER] getLoanDueDetails ERROR:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
