const Contact = require('../models/Contact');

/**
 * @desc    Submit inquiry from contact form
 * @route   POST /api/contact
 * @access  Public
 */
const submitContactMessage = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required.'
      });
    }

    const saved = await Contact.create({
      name,
      email,
      phone,
      subject,
      message
    });

    res.status(201).json({
      success: true,
      message: 'Inquiry received. Our Cairo team will respond within 4 business hours.',
      data: saved
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  submitContactMessage
};
