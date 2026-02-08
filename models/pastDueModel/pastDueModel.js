import { sql, poolPromise } from '../../config/db.js'

export const insertReports = async (reports) => {
    const pool = await poolPromise;

    const table = new sql.Table('dbo.ldts_Past_Due_Reports');
    table.create = false;

    // Define columns in the same order as the DB table
    table.columns.add('loan_account_no', sql.VarChar(50), { nullable: false });
    table.columns.add('disb_date', sql.VarChar(50), { nullable: true }); // string
    table.columns.add('funder', sql.VarChar(100), { nullable: true });    // new
    table.columns.add('tcaa', sql.VarChar(100), { nullable: true });      // new
    table.columns.add('written_off', sql.VarChar(10), { nullable: true });
    table.columns.add('smrd_coll_agency', sql.VarChar(50), { nullable: true });
    table.columns.add('region', sql.VarChar(50), { nullable: true });
    table.columns.add('company', sql.VarChar(100), { nullable: true });
    table.columns.add('division_no', sql.VarChar(50), { nullable: true });
    table.columns.add('station_no', sql.VarChar(50), { nullable: true });
    table.columns.add('employee_id', sql.VarChar(50), { nullable: true });
    table.columns.add('client_name', sql.VarChar(150), { nullable: true });
    table.columns.add('pn_value', sql.Decimal(15,2), { nullable: true });
    table.columns.add('principal_value', sql.Decimal(15,2), { nullable: true });
    table.columns.add('amort_amt', sql.Decimal(15,2), { nullable: true });
    table.columns.add('out_prin_bal', sql.Decimal(15,2), { nullable: true });
    table.columns.add('last_payment_date', sql.VarChar(50), { nullable: true }); // string
    table.columns.add('first_due_date', sql.VarChar(50), { nullable: true });    // string
    table.columns.add('maturity_date', sql.VarChar(50), { nullable: true });     // string
    table.columns.add('past_due', sql.Decimal(15,2), { nullable: true });
    table.columns.add('orb', sql.Decimal(15,2), { nullable: true });
    table.columns.add('nfc', sql.Decimal(15,2), { nullable: true });
    table.columns.add('penalty', sql.Decimal(15,2), { nullable: true });
    table.columns.add('total_orb', sql.Decimal(15,2), { nullable: true });
    table.columns.add('interest_discount_1', sql.Decimal(15,2), { nullable: true });
    table.columns.add('interest_discount_2', sql.Decimal(15,2), { nullable: true });
    table.columns.add('discounted_orb_1', sql.Decimal(15,2), { nullable: true });
    table.columns.add('discounted_orb_2', sql.Decimal(15,2), { nullable: true });
    table.columns.add('report_as_of', sql.VarChar(50), { nullable: true });

    // Add rows
    reports.forEach(r => {
        table.rows.add(
            r.loan_account_no, r.disb_date, r.funder, r.tcaa, r.written_off, r.smrd_coll_agency,
            r.region, r.company, r.division_no, r.station_no, r.employee_id,
            r.client_name, r.pn_value, r.principal_value, r.amort_amt, r.out_prin_bal,
            r.last_payment_date, r.first_due_date, r.maturity_date, r.past_due,
            r.orb, r.nfc, r.penalty, r.total_orb,
            r.interest_discount_1, r.interest_discount_2, r.discounted_orb_1, r.discounted_orb_2, r.report_as_of
        );
    });

    await pool.request().bulk(table);
};

export const getReports = async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query('SELECT * FROM [LDTS].[dbo].[ldts_Past_Due_Reports]');
        return result.recordset;
    } catch (err) {
        console.error('GET REPORTS ERROR:', err);
        throw err;
    }
};