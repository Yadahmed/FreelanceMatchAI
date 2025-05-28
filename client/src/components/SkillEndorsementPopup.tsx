import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ThumbsUp, Award, Users, MessageCircle, Star, Sparkles } from 'lucide-react';

interface SkillEndorsementPopupProps {
  isOpen: boolean;
  onClose: () => void;
  freelancerId: number;
  skillName: string;
  freelancerName: string;
  currentEndorsements?: number;
  hasUserEndorsed?: boolean;
}

const endorsementTypes = [
  {
    id: 'positive',
    icon: ThumbsUp,
    label: 'Skilled',
    description: 'Endorse this skill',
    color: 'bg-green-500',
    gradient: 'from-green-400 to-green-600'
  },
  {
    id: 'expert',
    icon: Award,
    label: 'Expert',
    description: 'Expert level skill',
    color: 'bg-purple-500',
    gradient: 'from-purple-400 to-purple-600'
  },
  {
    id: 'mentor',
    icon: Users,
    label: 'Mentor',
    description: 'Can teach others',
    color: 'bg-blue-500',
    gradient: 'from-blue-400 to-blue-600'
  }
];

export function SkillEndorsementPopup({
  isOpen,
  onClose,
  freelancerId,
  skillName,
  freelancerName,
  currentEndorsements = 0,
  hasUserEndorsed = false
}: SkillEndorsementPopupProps) {
  const [selectedType, setSelectedType] = useState<string>('positive');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const endorseMutation = useMutation({
    mutationFn: async (data: {
      freelancerId: number;
      skillName: string;
      endorsementType: string;
      comment?: string;
    }) => {
      return apiRequest('/api/endorsements', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/freelancers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/endorsements', freelancerId] });
      toast({
        title: "Skill Endorsed! ✨",
        description: `You've successfully endorsed ${freelancerName}'s ${skillName} skill.`,
      });
      onClose();
      setComment('');
      setSelectedType('positive');
    },
    onError: (error: any) => {
      toast({
        title: "Endorsement Failed",
        description: error.message || "Unable to submit endorsement. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleEndorse = async () => {
    if (hasUserEndorsed) {
      toast({
        title: "Already Endorsed",
        description: `You've already endorsed ${freelancerName}'s ${skillName} skill.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await endorseMutation.mutateAsync({
        freelancerId,
        skillName,
        endorsementType: selectedType,
        comment: comment.trim() || undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEndorsement = endorsementTypes.find(type => type.id === selectedType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Endorse Skill
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Skill Information */}
          <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg dark:from-blue-900/20 dark:to-purple-900/20">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Badge variant="secondary" className="text-sm font-medium">
                {skillName}
              </Badge>
              <Star className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Endorse <span className="font-semibold text-foreground">{freelancerName}</span> for this skill
            </p>
            {currentEndorsements > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {currentEndorsements} other{currentEndorsements !== 1 ? 's' : ''} have endorsed this skill
              </p>
            )}
          </div>

          {/* Endorsement Types */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Choose endorsement type</Label>
            <div className="grid grid-cols-3 gap-2">
              {endorsementTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                
                return (
                  <motion.button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`
                      relative p-3 rounded-lg border-2 transition-all duration-200
                      ${isSelected 
                        ? 'border-primary bg-primary/10 shadow-md' 
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      }
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className={`
                        p-2 rounded-full bg-gradient-to-r ${type.gradient} text-white
                        ${isSelected ? 'shadow-lg' : ''}
                      `}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-medium">{type.label}</span>
                    </div>
                    {isSelected && (
                      <motion.div
                        layoutId="selection-indicator"
                        className="absolute inset-0 border-2 border-primary rounded-lg"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
            {selectedEndorsement && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {selectedEndorsement.description}
              </p>
            )}
          </div>

          {/* Optional Comment */}
          <div>
            <Label htmlFor="comment" className="text-sm font-medium mb-2 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Add a comment (optional)
            </Label>
            <Textarea
              id="comment"
              placeholder={`Share why you're endorsing ${freelancerName}'s ${skillName} skill...`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {comment.length}/200
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEndorse}
              disabled={isSubmitting || hasUserEndorsed}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isSubmitting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 border-2 border-white border-t-transparent rounded-full"
                />
              ) : hasUserEndorsed ? (
                'Already Endorsed'
              ) : (
                'Endorse Skill'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}