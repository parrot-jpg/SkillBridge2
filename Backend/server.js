const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import models
const User = require('./models/User');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5174'  // In case 5173 is busy
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Helper functions
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Authentication middleware
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'No user found with this token'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'User account is deactivated'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server error in authentication'
    });
  }
};

// Authentication Routes
const { sendOTPEmail } = require('./src/utils/emailService');
const crypto = require('crypto');

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, password: password ? '[PROVIDED]' : '[MISSING]' });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }

    const user = await User.findByEmail(email);
    console.log('User found:', user ? 'YES' : 'NO');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    console.log('Testing password against hash...');
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password validation result:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    const token = generateToken(user._id);
    const userProfile = user.getPublicProfile();

    res.status(200).json({
      success: true,
      token,
      user: userProfile
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Error logging in'
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      email,
      password,
      userType,
      firstName,
      lastName,
      organizationName,
      contactPerson,
      ...profileData
    } = req.body;

    if (!email || !password || !userType) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email, password, and user type'
      });
    }

    if (userType === 'volunteer' && (!firstName || !lastName)) {
      return res.status(400).json({
        success: false,
        error: 'First and last name are required for volunteers'
      });
    }

    if (userType === 'ngo' && (!organizationName || !contactPerson)) {
      return res.status(400).json({
        success: false,
        error: 'Organization name and contact person are required for NGOs'
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Create user data object
    const userData = {
      email: email.toLowerCase(),
      password,
      userType,
      firstName,
      lastName,
      organizationName,
      contactPerson,
      profile: {
        phone: profileData.phone || '',
        location: profileData.location || '',
        website: profileData.website || '',
        bio: profileData.bio || '',
        skills: profileData.skills || [],
        experience: profileData.experience || '',
        availability: profileData.availability || '',
        interests: profileData.interests || [],
        description: profileData.description || '',
        mission: profileData.mission || '',
        focusAreas: profileData.focusAreas || [],
        size: profileData.size || '',
        foundedYear: profileData.foundedYear || null,
        registrationNumber: profileData.registrationNumber || ''
      }
    };

    const newUser = new User(userData);
    await newUser.save();

    const token = generateToken(newUser._id);
    const userProfile = newUser.getPublicProfile();

    res.status(201).json({
      success: true,
      token,
      user: userProfile
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating user account'
    });
  }
});

// Get current user
app.get('/api/auth/me', protect, async (req, res) => {
  try {
    const userProfile = req.user.getPublicProfile();
    res.status(200).json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error fetching user data'
    });
  }
});

// Forgot password - send OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // For security, do not reveal if email exists or not
      return res.status(200).json({ success: true, message: 'If the email exists, an OTP has been sent' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set OTP and expiry (15 minutes)
    user.passwordResetToken = otp;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.status(200).json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Error processing forgot password request' });
  }
});

// Reset password - verify OTP and update password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    if (!email || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid email or OTP' });
    }

    if (!user.passwordResetToken || !user.passwordResetExpires) {
      return res.status(400).json({ success: false, error: 'No password reset request found' });
    }

    if (user.passwordResetToken !== otp) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    if (user.passwordResetExpires < Date.now()) {
      return res.status(400).json({ success: false, error: 'OTP has expired' });
    }

    // Update password and clear reset token fields
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Error resetting password' });
  }
});

// User management routes
app.put('/api/users/profile', protect, async (req, res) => {
  try {
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this route
    delete updates.email;
    delete updates.password;
    delete updates.userType;
    delete updates._id;
    delete updates.__v;

    // Update user profile
    Object.keys(updates).forEach(key => {
      if (key === 'profile' && updates.profile) {
        // Merge profile data
        req.user.profile = { ...req.user.profile, ...updates.profile };
      } else if (key !== 'profile') {
        req.user[key] = updates[key];
      }
    });

    await req.user.save();
    const userProfile = req.user.getPublicProfile();

    res.status(200).json({
      success: true,
      user: userProfile
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating profile'
    });
  }
});

// Get volunteers (for NGOs and other users)
app.get('/api/users/volunteers', protect, async (req, res) => {
  try {
    const { skills, interests, experience, availability, location } = req.query;
    
    let query = { userType: 'volunteer', isActive: true };

    // Build MongoDB query based on filters
    if (skills) {
      const skillsArray = skills.split(',');
      query['profile.skills'] = { $in: skillsArray };
    }

    if (interests) {
      const interestsArray = interests.split(',');
      query['profile.interests'] = { $in: interestsArray };
    }

    if (experience) {
      query['profile.experience'] = experience;
    }

    if (availability) {
      query['profile.availability'] = availability;
    }

    if (location) {
      query['profile.location'] = { $regex: location, $options: 'i' };
    }

    const volunteers = await User.find(query).select('-password');

    res.status(200).json({
      success: true,
      count: volunteers.length,
      data: volunteers
    });
  } catch (error) {
    console.error('Get volunteers error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching volunteers'
    });
  }
});

// Get NGOs (for volunteers)
app.get('/api/users/ngos', protect, async (req, res) => {
  try {
    const { focusAreas, size, location } = req.query;
    
    let query = { userType: 'ngo', isActive: true };

    // Build MongoDB query based on filters
    if (focusAreas) {
      const focusAreasArray = focusAreas.split(',');
      query['profile.focusAreas'] = { $in: focusAreasArray };
    }

    if (size) {
      query['profile.size'] = size;
    }

    if (location) {
      query['profile.location'] = { $regex: location, $options: 'i' };
    }

    const ngos = await User.find(query).select('-password');

    res.status(200).json({
      success: true,
      count: ngos.length,
      data: ngos
    });
  } catch (error) {
    console.error('Get NGOs error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching NGOs'
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  try {
    const userCount = await User.countDocuments();
    const volunteerCount = await User.countDocuments({ userType: 'volunteer' });
    const ngoCount = await User.countDocuments({ userType: 'ngo' });

    res.status(200).json({
      success: true,
      message: 'Server is running',
      status: {
        server: 'healthy',
        database: dbStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      },
      users: {
        total: userCount,
        volunteers: volunteerCount,
        ngos: ngoCount
      }
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      status: {
        server: 'healthy',
        database: dbStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      },
      users: {
        total: 0,
        volunteers: 0,
        ngos: 0
      }
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NGO Connect Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        me: 'GET /api/auth/me'
      },
      users: {
        profile: 'PUT /api/users/profile',
        volunteers: 'GET /api/users/volunteers',
        ngos: 'GET /api/users/ngos'
      },
      health: 'GET /api/health'
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// MongoDB connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('✅ Connected to MongoDB Atlas');
      
      // Create sample users if none exist
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log('📝 Creating sample users...');
        
        const sampleUsers = [
          {
            email: 'volunteer@example.com',
            password: 'password123',
            userType: 'volunteer',
            firstName: 'John',
            lastName: 'Doe',
            profile: {
              bio: 'Experienced developer passionate about making a difference',
              skills: ['JavaScript', 'React', 'Node.js'],
              experience: 'advanced',
              availability: 'part-time',
              interests: ['Education', 'Technology', 'Environment'],
              location: 'New York, NY'
            }
          },
          {
            email: 'ngo@example.com',
            password: 'password123',
            userType: 'ngo',
            organizationName: 'Help Foundation',
            contactPerson: 'Jane Smith',
            profile: {
              description: 'We help communities through education and technology',
              mission: 'Making the world a better place through innovation',
              focusAreas: ['Education', 'Health', 'Technology'],
              size: 'medium',
              foundedYear: 2015,
              location: 'San Francisco, CA',
              website: 'https://helpfoundation.org'
            }
          }
        ];
        
        for (const userData of sampleUsers) {
          const user = new User(userData);
          await user.save();
        }
        
        console.log('✅ Sample users created successfully');
      } else {
        console.log(`📊 Database contains ${userCount} users`);
      }
    })
    .catch(err => {
      console.error('❌ MongoDB connection error:', err.message);
      console.log('💡 Please check your MongoDB Atlas connection string in .env file');
      console.log('📝 App will continue but database features won\'t work');
    });
} else {
  console.log('⚠️  No MongoDB URI provided. Please set MONGODB_URI in .env file');
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI ? 'MongoDB Atlas' : 'Not configured'}`);
  console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;
