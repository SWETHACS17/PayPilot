const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    customerName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'PAID', 'OVERDUE', 'DRAFT'],
        default: 'PENDING'
    }
}, {
    timestamps: true
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
