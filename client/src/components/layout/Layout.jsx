import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <Box sx={{ p: 3, flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
