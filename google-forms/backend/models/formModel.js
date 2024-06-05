const pool = require('../database/dbinnit');
const { FORM } = require('../config/constants');
const {maxOptions,maxQuestions}=FORM;

class Form{
    static async createForm(ownerId,title,description,questions){

        console.log('QUESTIONS', questions)

        const client = await pool.connect();
        try {
            await pool.query('BEGIN');
            if(questions?.length>maxQuestions){
                throw new Error(`More than ${maxQuestions} questions given`);
            }
            const formResult = await client.query(
                'INSERT INTO google_form.forms(ownerID, form_name, form_description) VALUES ($1,$2,$3) RETURNING formID',
                [ownerId,title,description]
            );
            const formId = formResult.rows[0].formid;

            for (const [index, question] of questions.entries()) {
                const questionResult = await client.query(
                    `INSERT INTO google_form.questions(fk_formID, fk_Type, questionText, questionPosition)
                     VALUES ($1, $2, $3, $4) RETURNING questionID`,
                    [formId, question.questionType, question.question, index + 1]
                );
                const questionId = questionResult.rows[0].questionid;

                if (question?.options && question?.options.length > 0) {
                    if(question?.options.length>maxOptions){
                        throw new Error(`More than ${maxOptions} options given`);
                    }
                    console.log(question.options)
                    for (const option of question.options) {
                        await client.query(
                            `INSERT INTO google_form.options(entryid,fk_questionID, option)
                             VALUES ((SELECT MAX(entryid) FROM google_form.options) + 1 ,$1, $2)`,
                            [questionId, option]
                        );
                    }
                }
            }

            await client.query('COMMIT');
            return {
                status: 'success',
                formLink: `http://localhost:3000/api/forms/${formId}`,
                message: 'Form created successfully'
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw new Error(`${error.message}`);
        } finally {
            client.release();
        }
    }

    static async getFormById(formId){
        const query = `
                        SELECT 
                            q.fk_Type AS questionType, 
                            q.questionText AS question, 
                            q.questionPosition AS questionPosition, 
                            q.questionID AS questionId, 
                            o.option AS option
                        FROM 
                            google_form.questions q
                        LEFT JOIN 
                            google_form.options o
                        ON 
                            q.questionID = o.fk_questionID
                        WHERE 
                            q.fk_formID = $1
                        ORDER BY 
                            q.questionPosition, q.questionID, o.fk_questionID;
                    `;
        try {
            const res = await pool.query(query, [formId]);
            
            const questionsMap = new Map();

            res.rows.forEach(row => {
                if (!questionsMap.has(row.questionid)) {
                    questionsMap.set(row.questionid, {
                        questionId: row.questionid,
                        questionType: row.questiontype,
                        questionPosition: row.questionposition,
                        question: row.question,
                        options: []
                    });
                }
                if (row.option) {
                    questionsMap.get(row.questionid).options.push(row.option);
                }
            });

            const questions = Array.from(questionsMap.values());
            return questions;
        } catch (err) {
            console.error('Error executing query', err.stack);
            throw err;
        }
    }

}

module.exports = Form;