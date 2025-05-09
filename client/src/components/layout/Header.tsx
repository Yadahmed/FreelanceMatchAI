import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/hooks/use-auth';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, MessageSquare, User, Settings, LogOut, BrainCircuit } from 'lucide-react';

export function Header() {
  const { currentUser, isAuthenticated, isClient, isFreelancer, signOut } = useAuth();

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!currentUser) return 'G';
    if (currentUser.displayName) {
      return currentUser.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return currentUser.username.substring(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6" />
            <span className="font-bold text-xl">FreelanceMatchAI</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            Home
          </Link>
          <Link href="/explore-freelancers" className="text-sm font-medium transition-colors hover:text-primary">
            Explore Freelancers
          </Link>
          <Link href="/about" className="text-sm font-medium transition-colors hover:text-primary">
            How It Works
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser?.photoURL || undefined} alt={currentUser?.displayName || currentUser?.username} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-flex">{currentUser?.displayName || currentUser?.username}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                
                {isClient && (
                  <DropdownMenuItem className="cursor-pointer" asChild>
                    <Link href="/client/dashboard" className="flex items-center">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <span>My Job Requests</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                
                {isFreelancer && (
                  <>
                    <DropdownMenuItem className="cursor-pointer" asChild>
                      <Link href="/freelancer-dashboard" className="flex items-center">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        <span>Freelancer Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" asChild>
                      <Link href="/freelancer-profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Edit Freelancer Profile</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/direct-chat" className="flex items-center">
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    <span>AI Diagnostic Tool</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  className="cursor-pointer text-destructive focus:text-destructive" 
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <AuthModal triggerButton={
                <Button>Get Started</Button>
              } />
            </>
          )}
        </div>
      </div>
    </header>
  );
}