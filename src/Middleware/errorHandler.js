const errorHandler = (err, req, res, next) => {
  console.error('Server error:', req.path, err.message);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }


  const status = err.status || 500;
  const isClientError = status >= 400 && status < 500;
  
  
  const message = isClientError 
    ? err.message 
    : 'An unexpected error occurred';

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { details: err.message, stack: err.stack })
  });
};

module.exports = errorHandler;