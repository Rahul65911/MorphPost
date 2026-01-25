import { useGoogleLogin } from '@react-oauth/google';
import { Button } from "@/components/ui/button";
import { Chrome } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

interface GoogleAuthButtonProps {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    onSuccess: () => void;
}

export const GoogleAuthButton = ({ isLoading, setIsLoading, onSuccess }: GoogleAuthButtonProps) => {
    const { toast } = useToast();
    const { googleLogin } = useAuth();

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            try {
                setIsLoading(true);
                await googleLogin(tokenResponse.access_token);
                onSuccess();
            } catch (error) {
                toast({
                    title: "Login Failed",
                    description: api.getErrorMessage(error),
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        },
        onError: () => {
            toast({
                title: "Google Login Failed",
                variant: "destructive",
            });
            setIsLoading(false);
        },
    });

    return (
        <Button
            variant="outline"
            className="h-11"
            onClick={() => loginWithGoogle()}
            disabled={isLoading}
            type="button"
        >
            <Chrome className="h-5 w-5 mr-2" />
            Google
        </Button>
    );
};
