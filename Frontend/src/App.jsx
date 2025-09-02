import { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import AuthModal from './components/AuthModal'
import VolunteerProfile from './components/VolunteerProfile'
import NGOProfile from './components/NGOProfile'
import authService from './services/authService'

function App() {
  const [currentView, setCurrentView] = useState('home') // home, volunteer-profile, ngo-profile
  const [authModal, setAuthModal] = useState({ isOpen: false, type: 'login' })
  const [user, setUser] = useState(null) // Will store user data after login
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing authentication on app load
  useEffect(() => {
    const initAuth = async () => {
      // First check localStorage for existing session
      if (authService.isAuthenticated()) {
        const localUser = authService.getUser()
        setUser(localUser)
        
        // Then verify with backend and update if needed
        try {
          const currentUser = await authService.getCurrentUser()
          if (currentUser) {
            setUser(currentUser)
          }
        } catch (error) {
          console.log('Could not verify user with backend:', error.message)
          // Keep the local user data, backend might be down
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const openAuthModal = (type) => {
    setAuthModal({ isOpen: true, type })
  }

  const closeAuthModal = () => {
    setAuthModal({ isOpen: false, type: 'login' })
  }

  const switchAuthType = (type) => {
    setAuthModal({ ...authModal, type })
  }

  const handleAuthSuccess = (userData) => {
    setUser(userData)
    closeAuthModal()
    
    // Redirect to appropriate profile based on user type
    if (userData.userType === 'volunteer') {
      setCurrentView('volunteer-profile')
    } else if (userData.userType === 'ngo') {
      setCurrentView('ngo-profile')
    }
  }

  const handleLogout = () => {
    authService.logout()
    setUser(null)
    setCurrentView('home')
  }

  const navigateToProfile = (userType) => {
    if (userType === 'volunteer') {
      setCurrentView('volunteer-profile')
    } else if (userType === 'ngo') {
      setCurrentView('ngo-profile')
    }
  }

  const navigateToHome = () => {
    setCurrentView('home')
  }

  const openSignupWithRole = (userType) => {
    // Open signup modal and set initial user type
    setAuthModal({ isOpen: true, type: 'register', initialUserType: userType })
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Render different views based on current state
  if (currentView === 'volunteer-profile') {
    return (
      <>
        <VolunteerProfile 
          user={user}
          onLoginClick={() => openAuthModal('login')}
          onSignUpClick={() => openAuthModal('register')}
          onHomeClick={navigateToHome}
          onLogout={handleLogout}
        />
        <AuthModal
          isOpen={authModal.isOpen}
          onClose={closeAuthModal}
          type={authModal.type}
          onSwitchType={switchAuthType}
          onAuthSuccess={handleAuthSuccess}
          initialUserType={authModal.initialUserType}
        />
      </>
    )
  }

  if (currentView === 'ngo-profile') {
    return (
      <>
        <NGOProfile 
          user={user}
          onLoginClick={() => openAuthModal('login')}
          onSignUpClick={() => openAuthModal('register')}
          onHomeClick={navigateToHome}
          onLogout={handleLogout}
        />
        <AuthModal
          isOpen={authModal.isOpen}
          onClose={closeAuthModal}
          type={authModal.type}
          onSwitchType={switchAuthType}
          onAuthSuccess={handleAuthSuccess}
          initialUserType={authModal.initialUserType}
        />
      </>
    )
  }

  // Home page view
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <Header 
        user={user}
        onLoginClick={() => openAuthModal('login')}
        onSignUpClick={() => openAuthModal('register')}
        onHomeClick={navigateToHome}
        onLogout={handleLogout}
      />

      {/* Hero Section */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Connect Skills with Purpose
          </h1>
          <p className="text-xl md:text-2xl mb-4 text-gray-300 max-w-4xl mx-auto">
            Join thousands of professionals using their expertise to create lasting impact.
          </p>
          <p className="text-xl md:text-2xl mb-12 text-gray-300 max-w-4xl mx-auto">
            Connect with NGOs worldwide and be part of meaningful change.
          </p>
          
          {/* CTA Buttons - Now opens signup modal */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <button 
              onClick={() => openSignupWithRole('volunteer')}
              className="bg-red-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-red-700"
            >
              Join as Volunteer
            </button>
            <button 
              onClick={() => openSignupWithRole('ngo')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700"
            >
              Register NGO
            </button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-red-500 mb-2">2,500+</div>
              <div className="text-gray-300">Active Volunteers</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-red-500 mb-2">850+</div>
              <div className="text-gray-300">Partner NGOs</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-red-500 mb-2">15,000+</div>
              <div className="text-gray-300">Hours Contributed</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-red-500 mb-2">120+</div>
              <div className="text-gray-300">Countries Reached</div>
            </div>
          </div>
        </div>
      </section>

      {/* How SkillBridge Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How SkillBridge Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Simple steps to make meaningful impact through skill-based volunteering
            </p>
          </div>
          
          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Your Profile</h3>
              <p className="text-gray-600 leading-relaxed">
                Sign up as a volunteer or NGO and showcase your skills, experience, and passion for making a difference in the world.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Find Perfect Matches</h3>
              <p className="text-gray-600 leading-relaxed">
                Browse opportunities or get matched based on your skills, interests, and availability. Our smart algorithm ensures the best fit.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Connect & Collaborate</h3>
              <p className="text-gray-600 leading-relaxed">
                Use our built-in communication tools to connect with partners and start making real, measurable impact together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Community Says
            </h2>
            <p className="text-lg text-gray-600">
              Real stories from volunteers and NGOs making impact together
            </p>
          </div>
          
          {/* Testimonials */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">SM</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Sarah Martinez</h4>
                  <p className="text-gray-600 text-sm">UX Designer, Tech Volunteer</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "SkillBridge connected me with an education NGO where I redesigned their learning platform. Seeing 10,000+ students benefit from my work was incredibly fulfilling."
              </p>
            </div>
            
            {/* Testimonial 2 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">RP</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Dr. Raj Patel</h4>
                  <p className="text-gray-600 text-sm">Director, Health Access Foundation</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "We found amazing volunteers through SkillBridge who helped us digitize our patient records system. The platform made collaboration seamless and effective."
              </p>
            </div>
            
            {/* Testimonial 3 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mr-4">
                  <span className="text-white font-bold">MJ</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Michael Johnson</h4>
                  <p className="text-gray-600 text-sm">Marketing Specialist</p>
                </div>
              </div>
              <p className="text-gray-700 italic">
                "I've helped 5 different NGOs with their digital marketing strategies. SkillBridge makes it easy to find meaningful projects that match my expertise."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={closeAuthModal}
        type={authModal.type}
        onSwitchType={switchAuthType}
        onAuthSuccess={handleAuthSuccess}
        initialUserType={authModal.initialUserType}
      />
    </div>
  )
}

export default App
