import React, { useState, useContext } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home,
  SportsTennis as SportsIcon,
  Group as TeamIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Favorite,
} from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';
import VolleyballIcon from '../icons/VolleyballIcon';

const drawerWidth = 240;

const MainLayout = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleCloseMenu();
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Home />,
      path: '/',
    },
    {
      text: 'Partite',
      icon: <VolleyballIcon />,
      path: '/matches',
    },
    {
      text: 'Squadre',
      icon: <TeamIcon />,
      path: '/teams',
    },
  ];

  const authenticatedMenuItems = [
    {
      text: 'Le mie notifiche',
      icon: <NotificationsIcon />,
      path: '/notifications',
    },
    {
      text: 'Le mie iscrizioni',
      icon: <Favorite />,
      path: '/subscriptions',
    },
  ];

  const adminMenuItems = [
    {
      text: 'Admin Dashboard',
      icon: <AdminIcon />,
      path: '/admin',
    },
    {
      text: 'Gestione Utenti',
      icon: <PersonIcon />,
      path: '/admin/users',
    },
    {
      text: 'Gestione Squadre',
      icon: <TeamIcon />,
      path: '/admin/teams',
    },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" component="div">
          AIBVC Club Series
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              selected={location.pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      {currentUser && (
        <>
          <Divider />
          <List>
            {authenticatedMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
      {currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
        <>
          <Divider />
          <List>
            {adminMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                  }}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              whiteSpace: 'nowrap', // Impedisce l'interruzione di riga
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            AIBVC Club Series Finals
          </Typography>
          {currentUser ? (
            <div>
              <IconButton
                onClick={handleProfileMenu}
                color="inherit"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                size="small"
              >
                <Avatar 
                  sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}
                >
                  {currentUser.firstName.charAt(0)}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
              >
                <MenuItem onClick={() => { navigate('/profile'); handleCloseMenu(); }}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  Profilo
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </div>
          ) : (
            <div>
              <Button 
                color="inherit" 
                onClick={() => navigate('/login')}
                size="small"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                Login
              </Button>
              <Button 
                color="inherit" 
                onClick={() => navigate('/register')}
                size="small"
                sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
              >
                Registrati
              </Button>
            </div>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1, sm: 3 }, // Ridotto il padding sui dispositivi mobili
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;