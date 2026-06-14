// Removes sensitive fields (e.g. password hash) from a User entity before sending it in an API response
export const sanitizeUser = (user: any) => {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return safeUser;
};

// Strips password hashes from a Complaint's nested user relations (assigned_to, created_by)
export const sanitizeComplaint = (complaint: any) => {
  if (!complaint) return complaint;
  return {
    ...complaint,
    assigned_to: sanitizeUser(complaint.assigned_to),
    created_by: sanitizeUser(complaint.created_by)
  };
};
