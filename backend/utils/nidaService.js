/**
 * Mock NIDA (National Identification Agency) API for Rwanda
 * Simulates identity verification based on National ID number
 */
const verifyNationalId = async (idNumber) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Basic validation for Rwandan ID (16 digits starting with 1 or 2)
  const idRegex = /^[1-2]\d{15}$/;
  if (!idRegex.test(idNumber.replace(/\s/g, ''))) {
    return {
      success: false,
      message: 'Invalid ID format. Rwandan IDs must be 16 digits.'
    };
  }

  // Mock data for simulation
  const mockData = {
    '1199080000000000': {
      name: 'SHYAKA CLEVER PRINCE',
      dob: '1990-05-15',
      gender: 'Male',
      status: 'Active'
    },
    '1199570000000000': {
      name: 'MUGISHA ALAIN',
      dob: '1995-10-20',
      gender: 'Male',
      status: 'Active'
    }
  };

  const normalizedId = idNumber.replace(/\s/g, '');
  const person = mockData[normalizedId];

  if (person) {
    return {
      success: true,
      data: person,
      message: 'Identity verified successfully with NIDA'
    };
  }

  // If not in mock list, return a generic success for most 16-digit IDs to allow testing
  return {
    success: true,
    data: {
      name: 'Verified Citizen',
      status: 'Active'
    },
    message: 'Identity verified with NIDA'
  };
};

module.exports = { verifyNationalId };
