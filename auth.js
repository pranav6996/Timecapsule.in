// auth.js
const token = localStorage.getItem('token');

if (!token) {
  // If no token is found, redirect the user to the login page
  window.location.href = 'login.html';
}