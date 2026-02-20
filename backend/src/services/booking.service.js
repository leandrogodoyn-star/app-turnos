const bookingRepo = require("../repositories/booking.repo");

exports.create = async (data) => {
  return bookingRepo.insert(data);
};
