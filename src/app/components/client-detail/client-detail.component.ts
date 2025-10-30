import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientService, Client } from '../../services/client.service';
import { AuthService } from '../../services/auth.service';
import { OptimizedStatusService } from '../../services/optimized-status.service';
import { ConfirmDeleteDialogComponent } from '../confirm-delete-dialog/confirm-delete-dialog.component';
import { catchError, throwError } from 'rxjs';

@Component({
  selector: 'app-client-detail',
  templateUrl: './client-detail.component.html',
  styleUrls: ['./client-detail.component.scss']
})
export class ClientDetailComponent implements OnInit {
  client: Client | null = null;
  loading = true;
  isLoading = true; // Track initial data loading state
  saving = false;
  error = '';
  isEditing = false;
  editableClient: Client | null = null;
  updatingLoanStatus = false;
  updatingGatewayStatus: string | null = null;

  // Custom dropdown properties
  isStatusDropdownOpen = false;

  // Stepper properties
  activeStep: number = 1;
  steps = [
    'Business & Personal Info',
    'Financial Information',
    'Documents & Images',
    'Payment Gateway',
    'Loan Status'
  ];
  maxSteps = 5;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    private authService: AuthService,
    private optimizedStatusService: OptimizedStatusService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const clientId = params.get('id');
      if (clientId) {
        this.loading = true;
        this.isLoading = true;
        this.error = '';
        this.loadClientDetails(clientId);
      } else {
        this.error = 'Client ID not found';
        this.loading = false;
        this.isLoading = false;
      }
    });
    
    // Subscribe to client updates to refresh data when client is updated
    this.clientService.clientUpdated$.subscribe(clientId => {
      if (clientId && this.client && this.client._id === clientId) {
        // Reload client details when this specific client is updated
        this.loadClientDetails(clientId);
      }
    });
    
    // Check for reload query parameter
    this.route.queryParams.subscribe(params => {
      if (params['reload'] && this.client) {
        // Reload client details when coming back from edit page
        this.loadClientDetails(this.client._id);
      } else if (params['reload']) {
        // If we don't have client yet but reload param is present, 
        // wait a bit and try to reload (in case of timing issues)
        setTimeout(() => {
          if (this.client && this.client._id) {
            this.loadClientDetails(this.client._id);
          }
        }, 500);
      }
    });
  }

  loadClientDetails(clientId: string): void {
    this.clientService.getClientDetails(clientId).subscribe({
      next: (response) => {
        this.client = response.client;
        this.loading = false;
        this.isLoading = false;
        
        // Ensure UI is updated after data reload
        console.log('Client details reloaded:', {
          payment_gateways_status: (this.client as any).payment_gateways_status,
          loan_status: (this.client as any).loan_status,
          business_document: this.client?.business_document_url,
          documents: this.client?.documents,
          processed_documents: this.client?.processed_documents
        });
        
        // Log partner documents specifically to help debug
        console.log('Partner documents in client.documents:');
        if (this.client?.documents) {
          Object.keys(this.client.documents).forEach(key => {
            if (key.includes('partner')) {
              console.log(`  ${key}:`, this.client!.documents![key]);
            }
          });
        }
        
        console.log('Partner documents in processed_documents:');
        if (this.client?.processed_documents) {
          Object.keys(this.client.processed_documents).forEach(key => {
            if (key.includes('partner')) {
              console.log(`  ${key}:`, this.client!.processed_documents![key]);
            }
          });
        }
        
        // Force change detection to ensure UI updates
        setTimeout(() => {
          // This helps ensure the UI reflects the latest data
        }, 100);
      },
      error: (error) => {
        this.error = 'Failed to load client details';
        this.loading = false;
        this.isLoading = false;
        console.error('Error loading client details:', error);
      }
    });
  }
  
  // Method to refresh client data and then preview document
  refreshAndPreviewDocument(docType: string): void {
    if (!this.client || !this.client._id) {
      this.snackBar.open('Client information not available', 'Close', { duration: 3000 });
      return;
    }
    
    // Show loading message
    const loadingSnackBar = this.snackBar.open('Refreshing document data...', 'Cancel', { duration: 10000 });
    
    // Reload client data to get latest document URLs
    this.clientService.getClientDetails(this.client._id).subscribe({
      next: (response) => {
        loadingSnackBar.dismiss();
        
        // Update client data with fresh information
        this.client = response.client;
        
        // Force change detection
        setTimeout(() => {
          // Now preview the document with updated data
          this.previewDocumentWithUpdatedData(docType);
        }, 100);
      },
      error: (error) => {
        loadingSnackBar.dismiss();
        console.error('Error refreshing client data:', error);
        this.snackBar.open('Error refreshing document data', 'Close', { duration: 3000 });
        
        // Still try to preview with existing data
        this.previewDocumentWithUpdatedData(docType);
      }
    });
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isTmisUser(): boolean {
    // Check if user email contains '@tmis.' domain
    const userEmail = localStorage.getItem('userEmail') || '';
    return userEmail.includes('@tmis.');
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'interested': return '#4caf50';
      case 'not_interested': return '#f44336';
      case 'hold': return '#ff9800';
      case 'pending': return '#9c27b0';
      case 'processing': return '#2196f3';
      default: return '#666';
    }
  }

  getClientProperty(property: string): any {
    if (!this.client) return null;
    
    // Use direct property access for fields that exist in Client interface
    switch (property) {
      case 'registration_number':
        return this.client.registration_number;
      case 'company_email':
        return this.client.company_email;
      case 'optional_mobile_number':
        return this.client.optional_mobile_number;
      case 'gst_number':
        return this.client.gst_number;
      case 'gst_status':
        return this.client.gst_status;
      default:
        // For dynamic fields that may not be in the interface, use type assertion
        return (this.client as any)[property];
    }
  }

  hasIEDocument(): boolean {
    if (!this.client || !this.client.processed_documents) return false;
    return !!(this.client.processed_documents['ie_code_document'] || 
              this.client.processed_documents['ie_code'] ||
              this.client.processed_documents['ie_document']);
  }

  hasBusinessDocument(): boolean {
    if (!this.client || !this.client.processed_documents) return false;
    return !!(this.client.processed_documents['business_document'] || 
              this.client.processed_documents['business_documents'] ||
              this.client.processed_documents['business_doc']);
  }

  getGSTStatus(): string {
    const gstStatus = this.getClientProperty('gst_status');
    const gstNumber = this.getClientProperty('gst_number');
    const registrationNumber = this.getClientProperty('registration_number');
    
    if (gstNumber || registrationNumber) {
      return gstStatus || 'Active';
    }
    return gstStatus || 'N/A';
  }

  getWebsiteURL(): string {
    const website = this.getClientProperty('website');
    if (!website) return 'N/A';
    
    // Add protocol if missing
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      return `https://${website}`;
    }
    return website;
  }

  // Helper method to normalize partner document keys
  private normalizeDocumentKey(key: string): string {
    // Normalize partner_aadhar_0, partner_0_aadhar, partner_aadhar_1, etc. to partner_aadhar_0, partner_aadhar_1
    // More comprehensive regex to match all partner document key variations
    const partnerAadharMatch = key.match(/partner[_\d]*aadhar[_\d]*/i);
    const partnerPanMatch = key.match(/partner[_\d]*pan[_\d]*/i);
    
    if (partnerAadharMatch) {
      // Extract the number from the key
      const numMatch = key.match(/\d+/);
      const num = numMatch ? numMatch[0] : '0';
      return `partner_aadhar_${num}`;
    }
    if (partnerPanMatch) {
      // Extract the number from the key
      const numMatch = key.match(/\d+/);
      const num = numMatch ? numMatch[0] : '0';
      return `partner_pan_${num}`;
    }
    return key;
  }

  // Helper method to find document in client.documents or processed_documents by checking all key variations
  private findDocumentByKey(docType: string, source: 'documents' | 'processed_documents'): any {
    const targetObject = source === 'documents' ? this.client?.documents : this.client?.processed_documents;
    if (!targetObject) return null;
    
    // First try exact match
    if (targetObject[docType]) {
      return targetObject[docType];
    }
    
    // If it's a partner document, try to find by normalized key
    const normalized = this.normalizeDocumentKey(docType);
    if (normalized !== docType) {
      // Try to find any key that normalizes to the same value
      for (const key of Object.keys(targetObject)) {
        if (this.normalizeDocumentKey(key) === normalized) {
          return targetObject[key];
        }
      }
    }
    
    return null;
  }

  getDocumentKeys(): string[] {
    const normalizedKeys = new Map<string, string>(); // Map normalized key to actual key
    
    // Prioritize documents (new format) over processed_documents (legacy format)
    // First, get keys from documents (new format from client creation/update)
    if (this.client && this.client.documents) {
      const documentKeys = Object.keys(this.client.documents).filter(key => 
        this.client!.documents![key] && 
        (typeof this.client!.documents![key] === 'object' || typeof this.client!.documents![key] === 'string')
      );
      documentKeys.forEach(key => {
        const normalized = this.normalizeDocumentKey(key);
        // Always use the key from documents (most recent)
        // This will overwrite any previous key with the same normalized form
        normalizedKeys.set(normalized, key);
      });
    }
    
    // Then, get keys from processed_documents (legacy format) only if not already in documents
    if (this.client && this.client.processed_documents) {
      Object.keys(this.client.processed_documents).forEach(key => {
        const normalized = this.normalizeDocumentKey(key);
        // Only add if not already present in documents (new format takes priority)
        if (!normalizedKeys.has(normalized)) {
          normalizedKeys.set(normalized, key);
        }
      });
    }
    
    // Add business document if it exists in any format
    const businessDocNormalized = 'business_document';
    if (this.client && (this.client.business_document_url || 
                        (this.client.documents && this.client.documents['business_document']) || 
                        (this.client.processed_documents && this.client.processed_documents['business_document']))) {
      // Only add if not already in the map
      if (!normalizedKeys.has(businessDocNormalized)) {
        normalizedKeys.set(businessDocNormalized, 'business_document');
      }
    }
    
    // Return only the unique keys (one per normalized form)
    return Array.from(normalizedKeys.values());
  }

  getDocumentFileName(docType: string): string {
    // Handle business document
    if (docType === 'business_document') {
      // Check documents (new format from client creation) first
      const doc = this.findDocumentByKey(docType, 'documents');
      if (doc) {
        if (typeof doc === 'object' && doc.original_filename) {
          return doc.original_filename;
        } else if (typeof doc === 'string') {
          // Extract filename from URL
          const urlParts = doc.split('/');
          const filename = urlParts[urlParts.length - 1].split('?')[0];
          return filename || `${docType}.pdf`;
        }
        // Fallback to document type name
        return `${docType}.pdf`;
      }
      // Check processed_documents (legacy format)
      const processedDoc = this.findDocumentByKey(docType, 'processed_documents');
      if (processedDoc) {
        return processedDoc.file_name;
      }
      // Fallback to old business_document_url
      if (this.client?.business_document_url) {
        // Extract filename from URL or use default
        const url = this.client.business_document_url;
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];
        return filename.includes('.') ? filename : 'business_document.pdf';
      }
    }
    
    // Check documents (new format) FIRST - prioritize updated documents
    const doc = this.findDocumentByKey(docType, 'documents');
    if (doc) {
      console.log(`Getting filename for ${docType} from client.documents:`, doc);
      
      if (typeof doc === 'object') {
        // Try multiple possible property names
        if (doc.original_filename) {
          console.log(`Found original_filename: ${doc.original_filename}`);
          return doc.original_filename;
        } else if (doc.file_name) {
          console.log(`Found file_name: ${doc.file_name}`);
          return doc.file_name;
        } else if (doc.filename) {
          console.log(`Found filename: ${doc.filename}`);
          return doc.filename;
        } else if (doc.name) {
          console.log(`Found name: ${doc.name}`);
          return doc.name;
        }
        console.log(`Document object has no filename property, available keys:`, Object.keys(doc));
      } else if (typeof doc === 'string') {
        // Extract filename from URL
        const urlParts = doc.split('/');
        const filename = urlParts[urlParts.length - 1].split('?')[0];
        console.log(`Extracted filename from URL: ${filename}`);
        return filename || `${docType}.pdf`;
      }
      // Fallback to document type name
      console.log(`No filename found in document object, using fallback: ${docType}.pdf`);
      return `${docType}.pdf`;
    }
    
    // Check processed_documents (legacy format) as fallback
    const processedDoc = this.findDocumentByKey(docType, 'processed_documents');
    if (processedDoc) {
      console.log(`Getting filename for ${docType} from processed_documents:`, processedDoc.file_name);
      return processedDoc.file_name;
    }
    
    console.log(`No filename found for ${docType}, returning Unknown`);
    return 'Unknown';
  }

  getDocumentFileSize(docType: string): number {
    // Handle business document
    if (docType === 'business_document') {
      // Check documents (new format from client creation) first
      const doc = this.findDocumentByKey(docType, 'documents');
      if (doc && typeof doc === 'object' && doc.bytes) {
        return doc.bytes;
      }
      // Check processed_documents (legacy format)
      const processedDoc = this.findDocumentByKey(docType, 'processed_documents');
      if (processedDoc) {
        return processedDoc.file_size;
      }
      // Fallback to old business_document_url - return 0 as we don't have size info from URL
      if (this.client?.business_document_url) {
        return 0;
      }
    }
    
    // Check documents (new format) FIRST - prioritize updated documents
    const doc = this.findDocumentByKey(docType, 'documents');
    if (doc && typeof doc === 'object' && doc.bytes) {
      return doc.bytes;
    }
    
    // Check processed_documents (legacy format) as fallback
    const processedDoc = this.findDocumentByKey(docType, 'processed_documents');
    if (processedDoc) {
      return processedDoc.file_size;
    }
    
    return 0;
  }

  isDocumentFromEnquiry(docType: string): boolean {
    // Check if document has the copied_from_enquiry flag
    if (this.client?.documents?.[docType]) {
      const doc = this.client.documents[docType];
      if (typeof doc === 'object' && doc.copied_from_enquiry) {
        return true;
      }
    }
    
    return false;
  }

  formatDocumentName(docType: string): string {
    return docType
      .split('_')
      .map(word => {
        // Handle special cases
        if (word.toLowerCase() === 'gst') return 'GST';
        if (word.toLowerCase() === 'pan') return 'PAN';
        if (word.toLowerCase() === 'msme') return 'MSME';
        if (word.toLowerCase() === 'ie') return 'IE';
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  isImageFile(fileName: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  canPreviewDocument(fileName: string): boolean {
    const previewableExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.pdf'];
    return previewableExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  canPreviewDocumentByType(docType: string): boolean {
    // Handle business document specifically
    if (docType === 'business_document') {
      // Check if we have a business document in any of the possible locations
      if (this.client?.documents?.[docType] || 
          this.client?.processed_documents?.[docType] || 
          this.client?.business_document_url) {
        return true;
      }
      return false;
    }
    
    // Always allow preview for known PDF document types
    if (this.isPdfDocumentType(docType)) {
      return true;
    }
    
    // For other document types, check by filename
    const fileName = this.getDocumentFileName(docType);
    return this.canPreviewDocument(fileName);
  }

  isPdfDocumentType(docType: string): boolean {
    const pdfDocumentTypes = [
      'gst_document',
      'bank_statement', 
      'ie_code_document',
      'partnership_deed_document',
      'msme_certificate',
      'incorporation_certificate',
      'registration_certificate',
      'license_document',
      'business_document'
    ];
    return pdfDocumentTypes.includes(docType);
  }

  previewDocument(docType: string): void {
    if (!this.client || !this.client._id) {
      this.snackBar.open('Client information not available', 'Close', { duration: 3000 });
      return;
    }
    
    console.log(`👁️ Previewing document: ${docType} for client: ${this.client._id}`);
    
    // Refresh client data and then preview document to ensure we have the latest document URLs
    this.refreshAndPreviewDocument(docType);
  }
  
  private previewDocumentWithUpdatedData(docType: string): void {
    if (!this.client || !this.client._id) {
      this.snackBar.open('Client information not available', 'Close', { duration: 3000 });
      return;
    }
    
    // Handle business document preview with priority logic
    if (docType === 'business_document') {
      // Check documents_original (preserved full format from backend) - THIS IS THE MOST RECENT FORMAT
      if (this.client.documents_original && this.client.documents_original['business_document']) {
        const doc = this.client.documents_original['business_document'];
        if (typeof doc === 'object' && doc.url) {
          console.log(`📄 Opening business document directly from URL (preserved full format): ${doc.url}`);
          // Force refresh by adding a timestamp to bypass cache
          const urlWithTimestamp = `${doc.url}?t=${new Date().getTime()}`;
          window.open(urlWithTimestamp, '_blank');
          return;
        }
      }
      // Check documents (new format from client creation) - THIS IS THE MOST RECENT FORMAT
      else if (this.client.documents?.['business_document']) {
        const doc = this.client.documents['business_document'];
        if (typeof doc === 'object' && doc.url) {
          console.log(`📄 Opening business document directly from URL (new format): ${doc.url}`);
          // Force refresh by adding a timestamp to bypass cache
          const urlWithTimestamp = `${doc.url}?t=${new Date().getTime()}`;
          window.open(urlWithTimestamp, '_blank');
          return;
        } else if (typeof doc === 'string' && doc.startsWith('http')) {
          console.log(`📄 Opening business document directly from URL (string format): ${doc}`);
          // Force refresh by adding a timestamp to bypass cache
          const urlWithTimestamp = `${doc}?t=${new Date().getTime()}`;
          window.open(urlWithTimestamp, '_blank');
          return;
        }
      }
      // Check processed_documents (legacy format)
      else if (this.client.processed_documents?.['business_document']) {
        console.log(`📄 Previewing processed business document via service (legacy format)`);
        // Use service-based preview for processed documents - this will handle the correct updated document
        const businessDocLoadingSnackBar = this.snackBar.open('Loading business document preview...', 'Cancel', { duration: 10000 });
        
        this.clientService.previewDocument(this.client._id, 'business_document').subscribe({
          next: (blob: Blob) => {
            businessDocLoadingSnackBar.dismiss();
            
            if (blob.size > 0) {
              const url = window.URL.createObjectURL(blob);
              const mimeType = blob.type || 'application/pdf';
              
              if (mimeType === 'application/pdf' || this.isPdfDocumentType('business_document')) {
                // Open PDF in new tab
                const newWindow = window.open('', '_blank');
                if (newWindow) {
                  newWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>PDF Preview - Business Document</title>
                        <style>
                          body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                          embed { width: 100%; height: 100vh; border: none; }
                        </style>
                      </head>
                      <body>
                        <embed src="${url}" type="application/pdf" onload="setTimeout(() => URL.revokeObjectURL('${url}'), 1000)" />
                      </body>
                    </html>
                  `);
                  newWindow.document.close();
                }
              } else {
                // For other types, just open the blob URL
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }
            } else {
              console.warn('Preview blob is empty for business document');
              this.snackBar.open('Unable to preview business document', 'Close', { duration: 3000 });
            }
          },
          error: (error) => {
            businessDocLoadingSnackBar.dismiss();
            console.error('Error previewing business document:', error);
            this.snackBar.open('Error previewing business document', 'Close', { duration: 3000 });
          }
        });
        return;
      }
      // Fallback to old business document (from enquiry)
      else if (this.client.business_document_url) {
        console.log(`📄 Opening old business document directly from URL: ${this.client.business_document_url}`);
        // Force refresh by adding a timestamp to bypass cache
        const urlWithTimestamp = `${this.client.business_document_url}?t=${new Date().getTime()}`;
        window.open(urlWithTimestamp, '_blank');
        return;
      }
    }
    
    // Check if document has direct URL (new format) - PRIORITIZE THIS
    // Use findDocumentByKey to handle key variations (e.g., partner_aadhar_0 vs partner_0_aadhar)
    const doc = this.findDocumentByKey(docType, 'documents');
    if (doc) {
      console.log(`📄 Checking document in client.documents for ${docType}:`, doc);
      
      if (typeof doc === 'object' && doc.url) {
        console.log(`📄 Opening document directly from URL: ${doc.url}`);
        // Force refresh by adding a timestamp to bypass cache
        const urlWithTimestamp = `${doc.url}?t=${new Date().getTime()}`;
        window.open(urlWithTimestamp, '_blank');
        return;
      } else if (typeof doc === 'string' && doc.startsWith('http')) {
        console.log(`📄 Opening document directly from URL (string format): ${doc}`);
        // Force refresh by adding a timestamp to bypass cache
        const urlWithTimestamp = `${doc}?t=${new Date().getTime()}`;
        window.open(urlWithTimestamp, '_blank');
        return;
      } else {
        console.log(`📄 Document exists in client.documents but no direct URL found, will use service-based preview`);
      }
    } else {
      console.log(`📄 Document not found in client.documents for ${docType}, checking processed_documents`);
    }
    
    // Only use service-based preview if document is NOT in client.documents (to avoid showing old documents)
    // If document exists in client.documents but has no URL, we should still try to get it from the backend
    // but the backend should prioritize client.documents over processed_documents
    const loadingSnackBar = this.snackBar.open('Loading preview...', 'Cancel', { duration: 10000 });
    
    this.clientService.previewDocument(this.client._id, docType).subscribe({
      next: (blob: Blob) => {
        loadingSnackBar.dismiss();
        
        if (blob.size > 0) {
          const url = window.URL.createObjectURL(blob);
          const mimeType = blob.type || 'application/octet-stream';
          
          if (mimeType.startsWith('image/')) {
            // Open image in new tab with proper styling
            const newWindow = window.open('', '_blank');
            if (newWindow) {
              newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Image Preview - ${docType}</title>
                    <style>
                      body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
                      img { max-width: 90%; max-height: 90vh; object-fit: contain; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                    </style>
                  </head>
                  <body>
                    <img src="${url}" onload="setTimeout(() => URL.revokeObjectURL('${url}'), 1000)" />
                  </body>
                </html>
              `);
              newWindow.document.close();
            }
          } else if (mimeType === 'application/pdf') {
            // Open PDF in new tab
            const newWindow = window.open('', '_blank');
            if (newWindow) {
              newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>PDF Preview - ${docType}</title>
                    <style>
                      body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
                      embed { width: 100%; height: 100vh; border: none; }
                    </style>
                  </head>
                  <body>
                    <embed src="${url}" type="application/pdf" onload="setTimeout(() => URL.revokeObjectURL('${url}'), 1000)" />
                  </body>
                </html>
              `);
              newWindow.document.close();
            }
          } else {
            // For other types, just open the blob URL
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        } else {
          console.warn('Preview blob is empty, trying direct download method');
          this.tryDirectPreview(docType);
        }
      },
      error: (error) => {
        loadingSnackBar.dismiss();
        console.error('Error previewing document:', error);
        
        // Provide specific error messages
        let errorMessage = 'Error previewing document. ';
        if (error.message) {
          errorMessage += error.message;
        } else if (error.status === 404) {
          errorMessage += 'Document not found.';
        } else if (error.status === 403) {
          errorMessage += 'Access denied.';
        } else if (error.status === 500) {
          errorMessage += 'Server error.';
        } else {
          errorMessage += 'Please try again.';
        }
        
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        
        // Try fallback method
        this.tryDirectPreview(docType);
      }
    });
  }

  private tryDirectPreview(docType: string): void {
    if (!this.client?._id) {
      this.snackBar.open('Client information not available.', 'Close', { duration: 3000 });
      return;
    }

    console.log('Trying direct URL preview...');
    
    // Use the service method to get direct URL
    this.clientService.getDirectDocumentUrl(this.client._id, docType).subscribe({
      next: (directUrl: string) => {
        console.log('Opening direct URL for preview:', directUrl);
        this.openDocumentForViewing(directUrl, docType);
      },
      error: (error) => {
        console.error('Failed to get direct URL:', error);
        
        // Final fallback: try to get URL from local client data
        if (this.client?.documents && this.client.documents[docType]) {
          const documentUrl = this.client.documents[docType];
          if (typeof documentUrl === 'string' && documentUrl.startsWith('https://')) {
            console.log('Using local client data URL:', documentUrl);
            this.openDocumentForViewing(documentUrl, docType);
          } else if (typeof documentUrl === 'object' && documentUrl.url) {
            console.log('Using local client data object URL:', documentUrl.url);
            this.openDocumentForViewing(documentUrl.url, docType);
          } else {
            this.snackBar.open('Unable to preview document. Please try downloading instead.', 'Close', { duration: 3000 });
          }
        } else {
          this.snackBar.open('Document not available for preview.', 'Close', { duration: 3000 });
        }
      }
    });
  }

  private openDocumentForViewing(url: string, docType: string): void {
    console.log('Opening document for viewing:', url);
    
    // For PDFs, open in new tab for viewing (not downloading)
    if (this.isPdfDocumentType(docType) || url.toLowerCase().includes('.pdf')) {
      // Open PDF in new tab for viewing
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (newWindow) {
        this.snackBar.open('PDF opened for viewing in new tab', 'Close', { duration: 3000 });
      } else {
        this.snackBar.open('Please allow popups to view the document', 'Close', { duration: 3000 });
      }
    } else {
      // For images, open in new tab with better styling
      const newWindow = window.open('', '_blank', 'noopener,noreferrer');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Document Preview - ${docType}</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh; 
                  background: #f5f5f5; 
                  font-family: Arial, sans-serif;
                }
                img { 
                  max-width: 90%; 
                  max-height: 90vh; 
                  object-fit: contain; 
                  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                  border-radius: 8px;
                }
                .title {
                  position: absolute;
                  top: 10px;
                  left: 20px;
                  background: rgba(0,0,0,0.7);
                  color: white;
                  padding: 8px 16px;
                  border-radius: 4px;
                  font-size: 14px;
                }
              </style>
            </head>
            <body>
              <div class="title">${this.formatDocumentName(docType)}</div>
              <img src="${url}" alt="Document Preview" />
            </body>
          </html>
        `);
        newWindow.document.close();
        this.snackBar.open('Document opened for viewing in new tab', 'Close', { duration: 3000 });
      } else {
        this.snackBar.open('Please allow popups to view the document', 'Close', { duration: 3000 });
      }
    }
  }

  downloadDocument(docType: string): void {
    if (!this.client || !this.client._id) {
      this.snackBar.open('Client information not available', 'Close', { duration: 3000 });
      return;
    }
    
    console.log(`📥 Downloading document: ${docType} for client: ${this.client._id}`);
    
    // Show loading message
    const loadingSnackBar = this.snackBar.open('Preparing download...', 'Cancel', { duration: 10000 });
    
    // Since backend endpoints are failing with 500 errors, go directly to URL-based download
    // This is more reliable and faster than trying multiple failing endpoints
    console.log('Skipping backend endpoints due to server errors, using direct URL method...');
    loadingSnackBar.dismiss();
    this.tryDirectUrlDownload(docType);
  }

  private tryAlternativeDownload(docType: string): void {
    if (!this.client?._id) return;
    
    console.log('Trying alternative download methods...');
    
    // Try direct download method
    this.clientService.downloadDocumentDirect(this.client._id, docType).subscribe({
      next: (blob: Blob) => {
        if (blob.size > 0) {
          const fileURL = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = fileURL;
          link.download = this.getDownloadFilename(docType);
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(fileURL);
          }, 100);
          this.snackBar.open('Download completed via alternative method!', 'Close', { duration: 3000 });
        } else {
          this.tryRawDownload(docType);
        }
      },
      error: () => {
        this.tryRawDownload(docType);
      }
    });
  }

  private tryRawDownload(docType: string): void {
    if (!this.client?._id) return;
    
    console.log('Trying raw download method...');
    
    // Try raw download method
    this.clientService.downloadDocumentRaw(this.client._id, docType).subscribe({
      next: (blob: Blob) => {
        if (blob.size > 0) {
          const fileURL = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = fileURL;
          link.download = this.getDownloadFilename(docType);
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(fileURL);
          }, 100);
          this.snackBar.open('Download completed via raw method!', 'Close', { duration: 3000 });
        } else {
          this.tryDirectUrlDownload(docType);
        }
      },
      error: () => {
        this.tryDirectUrlDownload(docType);
      }
    });
  }

  private tryDirectUrlDownload(docType: string): void {
    if (!this.client?._id) {
      this.snackBar.open('Client information not available.', 'Close', { duration: 3000 });
      return;
    }

    console.log('Trying direct URL download...');
    
    // Use the service method to get direct URL
    this.clientService.getDirectDocumentUrl(this.client._id, docType).subscribe({
      next: (directUrl: string) => {
        console.log('Using direct URL for download:', directUrl);
        this.downloadFileFromUrl(directUrl, docType);
      },
      error: (error) => {
        console.error('Failed to get direct URL for download:', error);
        
        // Final fallback: try to get URL from local client data
        if (this.client?.documents && this.client.documents[docType]) {
          const documentUrl = this.client.documents[docType];
          if (typeof documentUrl === 'string' && documentUrl.startsWith('https://')) {
            console.log('Using local client data URL for download:', documentUrl);
            this.downloadFileFromUrl(documentUrl, docType);
          } else if (typeof documentUrl === 'object' && documentUrl.url) {
            console.log('Using local client data object URL for download:', documentUrl.url);
            this.downloadFileFromUrl(documentUrl.url, docType);
          } else {
            this.snackBar.open('Unable to download file. Please contact support.', 'Close', { duration: 5000 });
          }
        } else {
          this.snackBar.open('Document not available for download.', 'Close', { duration: 3000 });
        }
      }
    });
  }

  private downloadFileFromUrl(url: string, docType: string): void {
    console.log('Downloading file from URL:', url);
    
    // Show downloading message
    const downloadingSnackBar = this.snackBar.open('Downloading file...', '', { duration: 5000 });
    
    // Check if it's a PDF file - PDFs from Cloudinary often have CORS issues with fetch
    const isPdf = url.toLowerCase().includes('.pdf') || 
                  docType.includes('gst') || 
                  docType.includes('bank_statement') || 
                  docType.includes('certificate') || 
                  docType.includes('deed') ||
                  docType.includes('ie_code') ||
                  docType === 'ie_code_document' ||
                  this.isPdfDocumentType(docType);
    
    if (isPdf) {
      // For PDFs, use direct download method to avoid corruption
      console.log('PDF detected, using direct download method to avoid corruption...');
      downloadingSnackBar.dismiss();
      this.downloadPdfDirectly(url, docType);
      return;
    }
    
    // For images, use fetch method which works better
    fetch(url, {
      mode: 'cors',
      credentials: 'omit' // Don't send credentials to avoid CORS issues
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        downloadingSnackBar.dismiss();
        
        // Create object URL from blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = this.getDownloadFilename(docType, url);
        
        // Force download by not setting target="_blank"
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up blob URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        
        this.snackBar.open('File downloaded successfully!', 'Close', { duration: 3000 });
      })
      .catch(error => {
        downloadingSnackBar.dismiss();
        console.error('Error downloading file:', error);
        
        // Fallback to direct download method
        this.downloadPdfDirectly(url, docType);
      });
  }

  private downloadPdfDirectly(url: string, docType: string): void {
    console.log('Using direct download method for PDF:', url);
    
    // For PDFs, avoid fetch/blob completely to prevent corruption
    // Use XMLHttpRequest with responseType 'arraybuffer' for binary integrity
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        // Create blob from array buffer (preserves binary data)
        const blob = new Blob([xhr.response], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = this.getDownloadFilename(docType, url);
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        
        this.snackBar.open('PDF saved to Downloads folder!', 'Close', { duration: 3000 });
      } else {
        console.error('XHR failed, trying direct link method');
        this.downloadPdfAlternative(url, docType);
      }
    };
    
    xhr.onerror = () => {
      console.error('XHR error, trying direct link method');
      this.downloadPdfAlternative(url, docType);
    };
    
    xhr.send();
  }

  private downloadPdfAlternative(url: string, docType: string): void {
    console.log('Using direct link method for PDF (no processing):', url);
    
    // Method 1: Try creating a temporary anchor with download attribute
    const link = document.createElement('a');
    link.href = url;
    link.download = this.getDownloadFilename(docType, url);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Method 2: If that doesn't work, try modifying Cloudinary URL for forced download
    setTimeout(() => {
      if (confirm('If the download didn\'t start, click OK to try an alternative method.')) {
        // For Cloudinary URLs, add fl_attachment flag to force download
        let downloadUrl = url;
        if (url.includes('cloudinary.com')) {
          // Insert fl_attachment before the file path to force download
          downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
        } else {
          // For other URLs, try adding download parameter
          downloadUrl = url + (url.includes('?') ? '&' : '?') + 'response-content-disposition=attachment';
        }
        
        console.log('Trying forced download URL:', downloadUrl);
        window.open(downloadUrl, '_blank');
      }
    }, 2000);
    
    this.snackBar.open('PDF download initiated. If it doesn\'t start, you\'ll see a confirmation dialog.', 'Close', { 
      duration: 4000 
    });
  }

  private getDownloadFilename(docType: string, url?: string): string {
    // Try to get filename from processed_documents first
    if (this.client?.processed_documents?.[docType]?.file_name) {
      return this.client.processed_documents[docType].file_name;
    }
    
    // Try to extract extension from URL if provided
    let extension = 'bin';
    if (url) {
      const urlParts = url.split('.');
      const urlExtension = urlParts[urlParts.length - 1].split('?')[0].toLowerCase();
      if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(urlExtension)) {
        extension = urlExtension;
      }
    }
    
    // If no extension from URL, use document type mapping
    if (extension === 'bin') {
      const extensionMap: {[key: string]: string} = {
        'gst_document': 'pdf',
        'bank_statement': 'pdf',
        'ie_code_document': 'pdf',
        'business_pan_document': 'jpg',
        'owner_pan_document': 'jpg',
        'owner_aadhaar_document': 'jpg',
        'owner_aadhar': 'jpg',
        'partnership_deed_document': 'pdf',
        'msme_certificate': 'pdf',
        'incorporation_certificate': 'pdf'
      };
      extension = extensionMap[docType] || 'bin';
    }
    
    // Generate a filename based on client name and document type
    const clientName = this.client?.legal_name || this.client?.user_name || 'document';
    const sanitizedName = clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const friendlyType = docType.replace(/_/g, '-');
    
    return `${sanitizedName}-${friendlyType}.${extension}`;
  }

  startEdit(): void {
    this.isEditing = true;
    this.editableClient = { ...this.client! };
    
    // Ensure all necessary fields like payment_gateways and status fields are initialized to prevent data loss
    if (!this.editableClient.payment_gateways) {
      this.editableClient.payment_gateways = (this.client as any).payment_gateways || [];
    }
    if (!(this.editableClient as any).payment_gateways_status) {
      (this.editableClient as any).payment_gateways_status = (this.client as any).payment_gateways_status || {};
    }
    if (!(this.editableClient as any).loan_status) {
      (this.editableClient as any).loan_status = (this.client as any).loan_status || 'soon';
    }
    
    console.log('Edit mode started with initialized fields:', {
      payment_gateways: this.editableClient.payment_gateways,
      payment_gateways_status: (this.editableClient as any).payment_gateways_status,
      loan_status: (this.editableClient as any).loan_status
    });
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editableClient = null;
  }

  saveEdit(): void {
    if (!this.editableClient || !this.client) return;

    // Set saving state to true to show loading effect
    this.saving = true;

    // Create FormData for the update
    const formData = new FormData();
    
    // Add all the editable fields to FormData
    const fieldsToUpdate = [
      'legal_name', 'trade_name', 'user_name', 'user_email', 'company_email',
      'mobile_number', 'optional_mobile_number', 'address', 'district', 
      'state', 'pincode', 'business_name', 'constitution_type', 'gst_number',
      'gst_status', 'business_pan', 'ie_code', 'website', 'business_url',
      'required_loan_amount', 'loan_purpose', 'repayment_period', 
      'monthly_income', 'existing_loans', 'bank_name', 'account_name', 'account_number',
      'ifsc_code', 'bank_type', 'new_business_account',
      'gateway', 'transaction_done_by_client', 'total_credit_amount',
      'average_monthly_balance', 'transaction_months', 'new_current_account',
      'number_of_partners', 'registration_number', 'gst_legal_name',
      'gst_trade_name', 'business_pan_name', 'business_pan_date',
      'owner_name', 'owner_dob', 'status', 'feedback'
    ];

    // Add all form fields to FormData
    fieldsToUpdate.forEach(field => {
      const value = (this.editableClient as any)[field];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(field, value.toString());
      }
    });

    // Add partner fields for partnerships
    if (this.editableClient.constitution_type === 'Partnership') {
      for (let i = 0; i < 10; i++) {
        const nameField = `partner_name_${i}`;
        const dobField = `partner_dob_${i}`;
        
        const nameValue = (this.editableClient as any)[nameField];
        const dobValue = (this.editableClient as any)[dobField];
        
        if (nameValue) formData.append(nameField, nameValue);
        if (dobValue) formData.append(dobField, dobValue);
      }
    }

    // Note: Payment gateways are not included in this update since client-detail page 
    // doesn't have editing UI for payment gateways. The backend will preserve existing values.

    // Use the updateClientDetails method which handles all fields
    this.clientService.updateClientDetails(this.client._id, formData).subscribe({
      next: (response: any) => {
        // Update the local client object with the new values
        Object.assign(this.client!, this.editableClient!);
        
        this.isEditing = false;
        this.editableClient = null;
        this.saving = false; // Reset saving state
        
        // Show enhanced success message based on WhatsApp status
        if (response.whatsapp_sent) {
          this.snackBar.open('Client updated successfully, WhatsApp message sent', 'Close', { duration: 4000 });
        } else if (response.whatsapp_quota_exceeded) {
          this.snackBar.open('Client updated successfully, WhatsApp message not sent due to limit reached', 'Close', { duration: 5000 });
        } else {
          this.snackBar.open('Client updated successfully', 'Close', { duration: 3000 });
        }
        
        // Reload client details to ensure we have the latest data
        this.loadClientDetails(this.client!._id);
        
        // The service will automatically notify other components about the update
        // through the clientUpdated$ observable, so we don't need to do anything here
      },
      error: (error: any) => {
        console.error('Error updating client:', error);
        this.saving = false; // Reset saving state on error
        this.snackBar.open('Failed to update client', 'Close', {
          duration: 3000
        });
      }
    });
  }

  deleteClient(): void {
    if (!this.client) return;

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: { name: this.client.legal_name || this.client.user_name || 'this client' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.client) {
        this.clientService.deleteClient(this.client._id).subscribe({
          next: () => {
            this.snackBar.open('Client deleted successfully', 'Close', {
              duration: 3000
            });
            this.router.navigate(['/clients']);
          },
          error: (error) => {
            this.snackBar.open('Failed to delete client', 'Close', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/clients']);
  }

  getOwnerName(): string {
    return this.getClientProperty('owner_name');
  }

  getOwnerDob(): string {
    return this.getClientProperty('owner_dob');
  }

  getPartnersList(): any[] {
    if (!this.client || this.client.constitution_type !== 'Partnership') {
      return [];
    }
    
    const partners = [];
    const numberOfPartners = this.client.number_of_partners || 10; // Check up to 10 partners
    
    for (let i = 0; i < numberOfPartners; i++) {
      // Try both field name patterns to ensure compatibility
      const partner = {
        name: (this.client as any)[`partner_name_${i}`] || (this.client as any)[`partner_${i}_name`] || '',
        dob: (this.client as any)[`partner_dob_${i}`] || (this.client as any)[`partner_${i}_dob`] || ''
      };
      if (partner.name || partner.dob) {
        partners.push(partner);
      }
    }
    
    return partners;
  }

  getPaymentGateways(): string[] {
    if (!this.client) {
      console.log('🚫 No client data available for payment gateways');
      return ['Cashfree', 'Easebuzz']; // Default gateways when no client data
    }
    
    // Try to get payment gateways from client data
    const gateways = (this.client as any).payment_gateways;
    console.log('🔍 Payment gateways from client data:', gateways, 'Type:', typeof gateways);
    
    if (Array.isArray(gateways) && gateways.length > 0) {
      console.log('✅ Payment gateways is array:', gateways);
      return gateways;
    }
    
    // If it's a string (JSON), try to parse it
    if (typeof gateways === 'string' && gateways.trim()) {
      try {
        const parsed = JSON.parse(gateways);
        console.log('✅ Parsed payment gateways from string:', parsed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.warn('❌ Failed to parse payment gateways:', gateways);
      }
    }
    
    console.log('⚠️ Payment gateways not found or invalid format, using defaults');
    return ['Cashfree', 'Easebuzz']; // Default gateways
  }

  getPaymentGatewayStatus(gateway: string): 'approved' | 'not_approved' | 'pending' {
    if (!this.client) return 'pending';
    const gatewayStatus = (this.client as any).payment_gateways_status;
    return gatewayStatus && gatewayStatus[gateway] ? gatewayStatus[gateway] : 'pending';
  }

  toggleGatewayApproval(gateway: string, status: 'approved' | 'not_approved'): void {
    if (!this.client || !this.isAdmin() || this.updatingGatewayStatus === gateway) return;
    
    // Set loading state briefly for visual feedback
    this.updatingGatewayStatus = gateway;
    
    // Initialize payment_gateways_status if it doesn't exist
    if (!(this.client as any).payment_gateways_status) {
      (this.client as any).payment_gateways_status = {};
    }
    
    // Store original status for rollback
    const originalStatus = this.getPaymentGatewayStatus(gateway);
    
    // Toggle status - if clicking the same status, set to pending, otherwise set to the clicked status
    const newStatus = originalStatus === status ? 'pending' : status;
    
    // INSTANT UI UPDATE: Update local state immediately for responsive UI
    const updatedGatewayStatus = { ...(this.client as any).payment_gateways_status };
    updatedGatewayStatus[gateway] = newStatus;
    (this.client as any).payment_gateways_status = updatedGatewayStatus;
    
    // Clear loading state immediately for instant feedback
    this.updatingGatewayStatus = null;
    
    // Show immediate success message
    this.snackBar.open(`Gateway ${gateway} marked as ${newStatus}`, 'Close', { 
      duration: 2000,
      panelClass: ['success-snackbar']
    });
    
    // BACKGROUND SYNC: Update backend without blocking UI
    this.optimizedStatusService.updatePaymentGatewayStatus(this.client._id, gateway, newStatus as 'approved' | 'not_approved' | 'pending').subscribe({
      next: (response: any) => {
        if (response.success) {
          console.log(`✅ Gateway ${gateway} status synced to backend: ${newStatus}`);
          
          // Show additional feedback if notifications were sent
          if (response.notifications_sent_async) {
            this.snackBar.open(`✓ Gateway ${gateway} updated & notifications sent`, 'Close', { 
              duration: 3000,
              panelClass: ['info-snackbar']
            });
          }
        } else {
          // Handle backend failure - rollback UI
          this.handleGatewayUpdateFailure(gateway, originalStatus, response.error);
        }
      },
      error: (error: any) => {
        // Handle network/server error - rollback UI
        this.handleGatewayUpdateFailure(gateway, originalStatus, 'Network error occurred');
      }
    });
  }
  
  private handleGatewayUpdateFailure(gateway: string, originalStatus: string, errorMessage: string): void {
    console.error(`❌ Failed to sync gateway status to backend: ${errorMessage}`);
    
    // ROLLBACK: Revert UI state on backend failure
    if (this.client) {
      if (!(this.client as any).payment_gateways_status) {
        (this.client as any).payment_gateways_status = {};
      }
      (this.client as any).payment_gateways_status[gateway] = originalStatus;
    }
    
    // Show error message with retry option
    const snackBarRef = this.snackBar.open(
      `Failed to update gateway ${gateway}. Reverted to ${originalStatus}.`, 
      'RETRY', 
      { 
        duration: 5000,
        panelClass: ['error-snackbar']
      }
    );
    
    // Handle retry action
    snackBarRef.onAction().subscribe(() => {
      const currentStatus = this.getPaymentGatewayStatus(gateway);
      const targetStatus = currentStatus === 'approved' ? 'not_approved' : 'approved';
      this.toggleGatewayApproval(gateway, targetStatus as 'approved' | 'not_approved');
    });
  }

  getLoanStatus(): string {
    return (this.client as any)?.loan_status || 'soon';
  }

  updateLoanStatus(status: 'approved' | 'hold' | 'processing' | 'rejected'): void {
    if (!this.client || !this.isAdmin() || this.updatingLoanStatus) return;
    
    // Set loading state briefly for visual feedback
    this.updatingLoanStatus = true;
    
    // Store the original status for potential rollback
    const originalStatus = (this.client as any).loan_status || 'soon';
    
    // INSTANT UI UPDATE: Update local state immediately for responsive UI
    (this.client as any).loan_status = status;
    
    // Clear loading state immediately for instant feedback
    this.updatingLoanStatus = false;
    
    // Show immediate success message
    this.snackBar.open(`Loan status updated to ${status}`, 'Close', { 
      duration: 2000,
      panelClass: ['success-snackbar']
    });
    
    // BACKGROUND SYNC: Update backend without blocking UI
    this.optimizedStatusService.updateLoanStatus(this.client._id, status).subscribe({
      next: (response: any) => {
        console.log('🔍 Loan status update response:', response);
        
        if (response.success) {
          console.log(`✅ Loan status synced to backend: ${status}`);
          
          // Check email notification status
          if (response.email_sent === true) {
            console.log('📧 Email notifications sent successfully');
            this.snackBar.open(`✓ Loan status updated & email notifications sent`, 'Close', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          } else if (response.email_sent === false) {
            console.warn('⚠️ Email notifications failed to send');
            this.snackBar.open(`✓ Loan status updated but email notifications failed`, 'Close', { 
              duration: 4000,
              panelClass: ['warning-snackbar']
            });
          } else if (response.notifications_sent_async) {
            console.log('📧 Email notifications sent asynchronously');
            this.snackBar.open(`✓ Loan status updated & notifications sent`, 'Close', { 
              duration: 3000,
              panelClass: ['info-snackbar']
            });
          } else {
            console.log('📧 Email notification status unknown');
          }
        } else {
          console.error('❌ Loan status update failed:', response.error);
          // Handle backend failure - rollback UI
          this.handleLoanStatusUpdateFailure(originalStatus, response.error);
        }
      },
      error: (error: any) => {
        console.error('❌ Network/server error during loan status update:', error);
        // Handle network/server error - rollback UI
        this.handleLoanStatusUpdateFailure(originalStatus, 'Network error occurred');
      }
    });
  }
  
  private handleLoanStatusUpdateFailure(originalStatus: string, errorMessage: string): void {
    console.error(`❌ Failed to sync loan status to backend: ${errorMessage}`);
    
    // ROLLBACK: Revert UI state on backend failure
    if (this.client) {
      (this.client as any).loan_status = originalStatus;
    }
    
    // Show error message with retry option
    const snackBarRef = this.snackBar.open(
      `Failed to update loan status. Reverted to ${originalStatus}.`, 
      'RETRY', 
      { 
        duration: 5000,
        panelClass: ['error-snackbar']
      }
    );
    
    // Handle retry action
    snackBarRef.onAction().subscribe(() => {
      const currentStatus = (this.client as any)?.loan_status || 'soon';
      // Determine what status to retry with based on context
      const statusOptions: ('approved' | 'hold' | 'processing' | 'rejected')[] = ['approved', 'hold', 'processing', 'rejected'];
      const nextStatus = statusOptions.find(s => s !== currentStatus) || 'processing';
      this.updateLoanStatus(nextStatus);
    });
  }

  getLoanStatusColor(status: string): string {
    switch (status) {
      case 'approved': return '#4caf50'; // Green
      case 'rejected': return '#f44336'; // Red
      case 'hold': return '#ff9800'; // Yellow/Orange
      case 'processing': return '#00bcd4'; // Sky Blue
      case 'soon': return '#9e9e9e'; // Gray
      default: return '#9e9e9e'; // Gray
    }
  }

  isGatewayUpdating(gateway: string): boolean {
    return this.updatingGatewayStatus === gateway;
  }

  isLoanStatusUpdating(): boolean {
    return this.updatingLoanStatus;
  }

  // Stepper methods
  setActiveStep(step: number): void {
    console.log(`🔄 Switching to step ${step}`);
    this.activeStep = step;
    // Scroll to top of content when changing steps
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  isStepActive(step: number): boolean {
    return this.activeStep === step;
  }

  // Custom dropdown methods for status selection
  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  selectStatus(status: string): void {
    if (this.editableClient) {
      this.editableClient.status = status;
    }
    this.isStatusDropdownOpen = false;
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'processing': return 'Processing';
      case 'interested': return 'Interested';
      case 'not_interested': return 'Not Interested';
      case 'hold': return 'Hold';
      default: return 'Pending';
    }
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    // Check if the click is outside the dropdown
    if (!target.closest('.relative')) {
      this.isStatusDropdownOpen = false;
    }
  }

  // Document verification methods
  getVerificationStatus(docType: string): string {
    if (!this.client || !this.client.processed_documents || !this.client.processed_documents[docType]) {
      return 'pending';
    }
    const doc = this.client.processed_documents[docType] as any;
    return doc.verification_status || 'pending';
  }

  // Role-based button visibility methods
  shouldShowVerifyButton(docType: string): boolean {
    const currentStatus = this.getVerificationStatus(docType);
    
    // Admin can see verify button when document is not verified (can reverse decisions)
    if (this.isAdmin()) {
      return currentStatus !== 'verified';
    }
    
    // Non-admin users: only show verify button if status is pending (hide once any decision is made)
    return currentStatus === 'pending';
  }

  shouldShowRejectButton(docType: string): boolean {
    const currentStatus = this.getVerificationStatus(docType);
    
    // Admin can see reject button when document is not rejected (can reverse decisions)
    if (this.isAdmin()) {
      return currentStatus !== 'rejected';
    }
    
    // Non-admin users: only show reject button if status is pending (hide once any decision is made)
    return currentStatus === 'pending';
  }

  verifyDocument(docType: string, status: 'verified' | 'rejected'): void {
    if (!this.client || !this.client._id) {
      this.snackBar.open('Client information not available', 'Close', { duration: 3000 });
      return;
    }

    const action = status === 'verified' ? 'verify' : 'reject';
    const loadingMessage = `${action === 'verify' ? 'Verifying' : 'Rejecting'} document...`;
    
    const loadingSnackBar = this.snackBar.open(loadingMessage, 'Cancel', { duration: 10000 });

    console.log(`🔍 Verifying document: ${docType} with status: ${status} for client: ${this.client._id}`);
    
    this.clientService.verifyDocument(this.client._id, docType, status).subscribe({
      next: (response) => {
        loadingSnackBar.dismiss();
        
        // Update the local client data
        if (this.client && this.client.processed_documents && this.client.processed_documents[docType]) {
          const doc = this.client.processed_documents[docType] as any;
          doc.verification_status = status;
          doc.verified_at = new Date().toISOString();
        }

        const successMessage = status === 'verified' 
          ? `Document "${this.formatDocumentName(docType)}" has been verified successfully!`
          : `Document "${this.formatDocumentName(docType)}" has been rejected.`;
        
        this.snackBar.open(successMessage, 'Close', { 
          duration: 4000,
          panelClass: status === 'verified' ? ['success-snackbar'] : ['error-snackbar']
        });
      },
      error: (error) => {
        loadingSnackBar.dismiss();
        console.error('Error verifying document:', error);
        
        const errorMessage = error.message || `Failed to ${action} document. Please try again.`;
        this.snackBar.open(errorMessage, 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // IE Code display method
  getIECodeDisplay(): string {
    const ieCodeNumber = this.getClientProperty('ie_code_number');
    const hasIEDocument = this.hasExistingDocument('ie_code') || this.hasExistingDocument('ie_code_document');
    
    if (ieCodeNumber) {
      return `Yes (${ieCodeNumber})`;
    } else if (hasIEDocument) {
      return 'Yes';
    } else {
      return 'No';
    }
  }
  
  // Helper method to check if IE document exists
  hasExistingDocument(docType: string): boolean {
    if (!this.client) return false;
    
    // Check in processed_documents (legacy format)
    if (this.client.processed_documents && this.client.processed_documents[docType]) {
      return true;
    }
    
    // Check in documents (new format)
    if (this.client.documents && this.client.documents[docType]) {
      return true;
    }
    
    return false;
  }

  // Signature check method
  hasSignature(): boolean {
    if (!this.client) return false;
    
    // Check for signature field or signature_url
    const signature = (this.client as any).signature || (this.client as any).signature_url;
    if (signature) return true;
    
    // Check for signature document in documents (new format)
    if (this.client.documents && this.client.documents['signature']) {
      return true;
    }
    
    // Check for signature document in processed_documents (legacy format)
    if (this.client.processed_documents && this.client.processed_documents['signature']) {
      return true;
    }
    
    return false;
  }

  // Product Images methods
  hasProductImages(): boolean {
    if (!this.client) return false;
    const productImages = (this.client as any).product_images;
    return Array.isArray(productImages) && productImages.length > 0;
  }

  getProductImagesCount(): number {
    if (!this.client) return 0;
    const productImages = (this.client as any).product_images;
    return Array.isArray(productImages) ? productImages.length : 0;
  }

  getProductImages(): any[] {
    if (!this.client) return [];
    const productImages = (this.client as any).product_images;
    return Array.isArray(productImages) ? productImages : [];
  }

  // User Photos methods
  hasUserPhotos(): boolean {
    if (!this.client) return false;
    const userPhotos = (this.client as any).user_photos;
    return Array.isArray(userPhotos) && userPhotos.length > 0;
  }

  getUserPhotosCount(): number {
    if (!this.client) return 0;
    const userPhotos = (this.client as any).user_photos;
    return Array.isArray(userPhotos) ? userPhotos.length : 0;
  }

  getUserPhotos(): any[] {
    if (!this.client) return [];
    const userPhotos = (this.client as any).user_photos;
    return Array.isArray(userPhotos) ? userPhotos : [];
  }

  // View image in new tab
  viewImage(imageUrl: string): void {
    if (!imageUrl) {
      this.snackBar.open('Image URL not available', 'Close', { duration: 3000 });
      return;
    }
    window.open(imageUrl, '_blank');
  }

  // Open WhatsApp chat with mobile number
  openWhatsApp(mobileNumber: string | null | undefined): void {
    if (!mobileNumber || mobileNumber === 'N/A') {
      this.snackBar.open('Mobile number not available', 'Close', { duration: 3000 });
      return;
    }

    // Remove any non-digit characters from the mobile number
    const cleanNumber = mobileNumber.replace(/\D/g, '');
    
    if (cleanNumber.length < 10) {
      this.snackBar.open('Invalid mobile number', 'Close', { duration: 3000 });
      return;
    }

    // Format for WhatsApp (add country code if not present)
    let whatsappNumber = cleanNumber;
    if (!cleanNumber.startsWith('91') && cleanNumber.length === 10) {
      whatsappNumber = '91' + cleanNumber; // Add India country code
    }

    // Open WhatsApp Web
    const whatsappUrl = `https://wa.me/${whatsappNumber}`;
    window.open(whatsappUrl, '_blank');
    this.snackBar.open('Opening WhatsApp...', 'Close', { duration: 2000 });
  }

  // Open email in Gmail
  openEmailInGmail(email: string | null | undefined): void {
    if (!email || email === 'N/A') {
      this.snackBar.open('Email address not available', 'Close', { duration: 3000 });
      return;
    }

    // Open Gmail compose with the email address
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
    window.open(gmailUrl, '_blank');
    this.snackBar.open('Opening Gmail...', 'Close', { duration: 2000 });
  }

  // Open address in Google Maps
  openAddressInGoogleMaps(): void {
    if (!this.client) {
      this.snackBar.open('Client information not available', 'Close', { duration: 3000 });
      return;
    }

    // Build full address from available fields
    const addressParts = [
      this.client.address,
      this.client.district,
      this.client.state,
      this.client.pincode
    ].filter(part => part && part !== 'N/A');

    if (addressParts.length === 0) {
      this.snackBar.open('Address not available', 'Close', { duration: 3000 });
      return;
    }

    const fullAddress = addressParts.join(', ');
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
    window.open(mapsUrl, '_blank');
    this.snackBar.open('Opening Google Maps...', 'Close', { duration: 2000 });
  }

  // Copy GST number and redirect to GST portal
  copyAndRedirectToGST(): void {
    const gstNumber = this.getClientProperty('registration_number');
    
    if (!gstNumber || gstNumber === 'N/A') {
      this.snackBar.open('GST Registration Number not available', 'Close', { duration: 3000 });
      return;
    }

    // Copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(gstNumber).then(() => {
        this.snackBar.open('GST Number copied to clipboard!', 'Close', { duration: 2000 });
        
        // Redirect to GST portal after a short delay
        setTimeout(() => {
          const gstPortalUrl = 'https://services.gst.gov.in/services/searchtp';
          window.open(gstPortalUrl, '_blank');
        }, 500);
      }).catch(err => {
        console.error('Failed to copy GST number:', err);
        this.fallbackCopyGST(gstNumber);
      });
    } else {
      // Fallback for older browsers
      this.fallbackCopyGST(gstNumber);
    }
  }

  // Fallback method to copy GST number for older browsers
  private fallbackCopyGST(gstNumber: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = gstNumber;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.snackBar.open('GST Number copied to clipboard!', 'Close', { duration: 2000 });
      
      // Redirect to GST portal after a short delay
      setTimeout(() => {
        const gstPortalUrl = 'https://services.gst.gov.in/services/searchtp';
        window.open(gstPortalUrl, '_blank');
      }, 500);
    } catch (err) {
      console.error('Failed to copy GST number:', err);
      this.snackBar.open('Failed to copy GST number', 'Close', { duration: 3000 });
    } finally {
      document.body.removeChild(textArea);
    }
  }

  // Navigate to edit client page
  editClient(): void {
    if (!this.client || !this.client._id) {
      this.snackBar.open('Client information not available', 'Close', { duration: 3000 });
      return;
    }
    
    this.router.navigate(['/clients', this.client._id, 'edit']);
  }

  // Navigate to edit client page with Payment Gateway step active (for admins only)
  editEnquiry(): void {
    if (!this.client || !this.client._id) {
      this.snackBar.open('Client information not available', 'Close', { duration: 3000 });
      return;
    }
    
    // Navigate to edit-client page with step parameter to show Payment Gateway step (step 8)
    this.router.navigate(['/clients', this.client._id, 'edit'], {
      queryParams: { step: 8 }
    });
  }

}
