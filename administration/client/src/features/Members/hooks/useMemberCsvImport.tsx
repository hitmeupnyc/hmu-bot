import { ApplicationFormData } from '@/types';
import { useState } from 'react';

export function useMemberCsvImport() {
  const [csvImportLoading, setCsvImportLoading] = useState(false);

  const handleCsvImport = async (applications: ApplicationFormData[]) => {
    setCsvImportLoading(true);

    try {
      const response = await fetch('/api/applications/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applications }),
      });

      const result = await response.json();

      if (response.ok || response.status === 207) {
        const { imported, total, errors } = result.data;

        if (errors && errors.length > 0) {
          const errorDetails = errors
            .map(
              (err: any) =>
                `Row ${err.index}: ${err.email || 'Unknown'} - ${err.error}`
            )
            .join('\n');

          alert(
            `Import completed with some errors:\n\nImported: ${imported}/${total}\n\nErrors:\n${errorDetails}`
          );
        } else {
          alert(`Successfully imported all ${imported} applications!`);
        }
      } else {
        throw new Error(result.error || 'Failed to import applications');
      }
    } catch (error) {
      console.error('Error importing applications:', error);
      alert('Failed to import applications. Please try again.');
    } finally {
      setCsvImportLoading(false);
    }
  };

  return {
    handleCsvImport,
    isCsvImportLoading: csvImportLoading,
  };
}
