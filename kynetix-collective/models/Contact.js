const { pool } = require('../config/db');

class Contact {
  /**
   * Save incoming inquiry from contact page
   */
  static async create({ name, email, phone = '', subject, message }) {
    const [result] = await pool.query(
      `INSERT INTO contact_messages (name, email, phone, subject, message) 
       VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), email.trim(), phone.trim(), subject.trim(), message.trim()]
    );

    return {
      id: result.insertId,
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim()
    };
  }
}

module.exports = Contact;
