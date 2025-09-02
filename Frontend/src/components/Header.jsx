const Header = ({ user, onLoginClick, onSignUpClick, onHomeClick, onLogout }) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={onHomeClick}>
            <div className="bg-red-600 text-white px-2 py-1 rounded text-sm font-bold mr-2">
              SB
            </div>
            <span className="text-lg font-semibold text-gray-900">SkillBridge</span>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <button onClick={onHomeClick} className="text-gray-700 hover:text-gray-900">Home</button>
            <a href="#" className="text-gray-700 hover:text-gray-900">About</a>
            <a href="#" className="text-gray-700 hover:text-gray-900">Opportunities</a>
          </nav>
          
          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              // Authenticated user menu
              <div className="flex items-center space-x-4">
                <div className="text-gray-700">
                  Welcome, {user.firstName || user.contactPerson || user.email}
                </div>
                <button 
                  onClick={onLogout}
                  className="text-gray-700 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded hover:border-gray-400"
                >
                  Logout
                </button>
              </div>
            ) : (
              // Guest user buttons
              <>
                <button 
                  onClick={onLoginClick}
                  className="text-gray-700 hover:text-gray-900"
                >
                  Login
                </button>
                <button 
                  onClick={onSignUpClick}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
