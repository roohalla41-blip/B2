import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/sarraaf/Pieces';
import { Network, Share2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function AgencyChooser() {
  return (
    <>
      <PageHeader title="نمایندگی‌ها" icon={Network} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/agents">
          <Card className="hover:bg-muted/30 transition-colors">
            <CardContent className="p-6 flex flex-col items-center gap-2">
              <Users className="w-10 h-10 text-primary" />
              <span className="text-sm font-medium">نمایندگی خودم</span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/agency-network">
          <Card className="hover:bg-muted/30 transition-colors">
            <CardContent className="p-6 flex flex-col items-center gap-2">
              <Share2 className="w-10 h-10 text-primary" />
              <span className="text-sm font-medium">نمایندگی خارجی</span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}