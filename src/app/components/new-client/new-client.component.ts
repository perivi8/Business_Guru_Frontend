import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientService } from '../../services/client.service';
import { UserService, User } from '../../services/user.service';

@Component({
  selector: 'app-new-client',
  templateUrl: './new-client.component.html',
  styleUrls: ['./new-client.component.scss']
})
export class NewClientComponent implements OnInit {
  // Step Forms
  step1Form!: FormGroup; // Basic Info & GST
  step2Form!: FormGroup; // Partnership & Business PAN
  step3Form!: FormGroup; // Bank Details
  step4Form!: FormGroup; // Review
  
  formsInitialized = false; // Add safety flag
  currentStep = 0;
  loading = false;
  error = '';
  success = '';
  
  staffMembers: User[] = [];
  uploadedFiles: { [key: string]: File } = {};
  
  // Dynamic form data
  constitutionType = '';
  gstStatus = '';
  numberOfPartners = 0;
  hasBusinessPan = false;
  filteredBankNames: string[] = [];
  filteredNewBankNames: string[] = [];
  filteredDistricts: string[] = [];
  selectedState = '';
  bankStatements: { file: File | null }[] = [{ file: null }];
  businessPanDetails: any = {};
  hasNewCurrentAccount = false;
  
  // Indian States and Districts mapping
  stateDistrictMapping: { [key: string]: string[] } = {
    'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
    'Arunachal Pradesh': ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai', 'Pakke Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
    'Assam': ['Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Dima Hasao', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'],
    'Bihar': ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],
    'Chhattisgarh': ['Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Gaurela Pendra Marwahi', 'Janjgir Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sukma', 'Surajpur', 'Surguja'],
    'Goa': ['North Goa', 'South Goa'],
    'Gujarat': ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
    'Haryana': ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
    'Himachal Pradesh': ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
    'Jharkhand': ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'],
    'Karnataka': ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'],
    'Kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
    'Madhya Pradesh': ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
    'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
    'Manipur': ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'],
    'Meghalaya': ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],
    'Mizoram': ['Aizawl', 'Champhai', 'Hnahthial', 'Kolasib', 'Khawzawl', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Saitual', 'Serchhip'],
    'Nagaland': ['Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Noklak', 'Peren', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],
    'Odisha': ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'],
    'Punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'SAS Nagar', 'Shaheed Bhagat Singh Nagar', 'Tarn Taran'],
    'Rajasthan': ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],
    'Sikkim': ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim'],
    'Tamil Nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupattur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
    'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
    'Tripura': ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
    'Uttar Pradesh': ['Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shrawasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
    'Uttarakhand': ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
    'West Bengal': ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
    'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
    'Jammu and Kashmir': ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
    'Ladakh': ['Kargil', 'Leh'],
    'Puducherry': ['Karaikal', 'Mahe', 'Puducherry', 'Yanam']
  };
  
  bankNames = [
    // Major Public Sector Banks
    'State Bank of India', 'Punjab National Bank', 'Bank of Baroda', 'Canara Bank', 'Union Bank of India',
    'Bank of India', 'Central Bank of India', 'Indian Bank', 'Indian Overseas Bank', 'UCO Bank',
    'Bank of Maharashtra', 'Punjab & Sind Bank',
    
    // Major Private Sector Banks
    'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank', 'IndusInd Bank',
    'Federal Bank', 'South Indian Bank', 'Karnataka Bank', 'City Union Bank', 'DCB Bank',
    'RBL Bank', 'IDFC First Bank', 'Bandhan Bank', 'CSB Bank', 'Equitas Small Finance Bank',
    
    // Small Finance Banks
    'AU Small Finance Bank', 'Capital Small Finance Bank', 'Esaf Small Finance Bank',
    'Fincare Small Finance Bank', 'Jana Small Finance Bank', 'North East Small Finance Bank',
    'Suryoday Small Finance Bank', 'Ujjivan Small Finance Bank', 'Utkarsh Small Finance Bank',
    
    // Regional Rural Banks
    'Andhra Pradesh Grameena Vikas Bank', 'Andhra Pragathi Grameena Bank', 'Arunachal Pradesh Rural Bank',
    'Assam Gramin Vikash Bank', 'Bihar Gramin Bank', 'Chhattisgarh Rajya Gramin Bank',
    'Ellaquai Dehati Bank', 'Himachal Pradesh Gramin Bank', 'J&K Grameen Bank',
    'Jharkhand Rajya Gramin Bank', 'Karnataka Gramin Bank', 'Kerala Gramin Bank',
    'Madhya Pradesh Gramin Bank', 'Maharashtra Gramin Bank', 'Manipur Rural Bank',
    'Meghalaya Rural Bank', 'Mizoram Rural Bank', 'Nagaland Rural Bank', 'Odisha Gramya Bank',
    'Paschim Banga Gramin Bank', 'Puduvai Bharathiar Grama Bank', 'Punjab Gramin Bank',
    'Rajasthan Marudhara Gramin Bank', 'Sarva Haryana Gramin Bank', 'Tamil Nadu Grama Bank',
    'Telangana Grameena Bank', 'Tripura Gramin Bank', 'Utkal Grameen Bank', 'Uttar Bihar Gramin Bank',
    'Uttarakhand Gramin Bank', 'Uttaranchal Gramin Bank', 'Vidharbha Konkan Gramin Bank',
    
    // Cooperative Banks
    'Saraswat Cooperative Bank', 'Cosmos Cooperative Bank', 'Abhyudaya Cooperative Bank',
    'TJSB Sahakari Bank', 'Bassein Catholic Cooperative Bank', 'Kalupur Commercial Cooperative Bank',
    'Nutan Nagarik Sahakari Bank', 'Shamrao Vithal Cooperative Bank', 'The Mumbai District Central Cooperative Bank',
    
    // Foreign Banks
    'Citibank', 'Standard Chartered Bank', 'HSBC Bank', 'Deutsche Bank', 'Barclays Bank',
    'Bank of America', 'JPMorgan Chase Bank', 'DBS Bank', 'Mizuho Bank', 'MUFG Bank',
    
    // Payment Banks
    'Paytm Payments Bank', 'Airtel Payments Bank', 'India Post Payments Bank', 'Fino Payments Bank',
    'Jio Payments Bank', 'NSDL Payments Bank'
  ];
  
  totalCreditAmount = '';
  creditAmountUnit = 'Lakhs';
  transactionMonths = 6;
  
  extractedData: any = {};
  isExtractingData = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private clientService: ClientService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.initializeForms();
    this.loadStaffMembers();
    this.filteredBankNames = [];
  }

  initializeForms(): void {
    // Step 1: Basic Info & GST
    this.step1Form = this.formBuilder.group({
      registration_number: ['', Validators.required],
      legal_name: ['', Validators.required],
      address: ['', Validators.required],
      district: ['', Validators.required],
      state: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      trade_name: ['', Validators.required],
      user_email: ['', [Validators.email]], // Made optional
      company_email: ['', [Validators.email]], // New optional field
      mobile_number: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      optional_mobile_number: ['', [Validators.pattern(/^\d{10}$/)]], // Optional mobile number
      gst_status: ['', Validators.required],
      constitution_type: ['', Validators.required]
    });

    // Step 2: Upload Documents
    this.step2Form = this.formBuilder.group({
      business_pan_name: [''],
      business_pan_date: [''],
      business_pan_document: [''],
      owner_name: [''],
      owner_dob: [''],
      owner_aadhar: [''],
      owner_pan: [''],
      has_business_pan: ['no'],
      website: ['', Validators.pattern('https?://.+')]
    });
    
    // Remove all validators initially - they will be set dynamically based on constitution type
    Object.keys(this.step2Form.controls).forEach(key => {
      this.step2Form.get(key)?.clearValidators();
      this.step2Form.get(key)?.updateValueAndValidity();
    });

    // Step 3: Bank Details
    this.step3Form = this.formBuilder.group({
      bank_name: ['', Validators.required],
      account_name: [''],
      bank_account_number: [''],
      ifsc_code: [''],
      bank_type: ['', Validators.required],
      transaction_months: [6, Validators.required],
      total_credit_amount: ['', Validators.required],
      new_current_account: ['', Validators.required],
      // New bank details fields (conditional)
      new_bank_account_number: [''],
      new_ifsc_code: [''],
      new_account_name: [''],
      new_bank_name: ['']
    });

    // Step 4: Review (no form controls, just display)
    this.step4Form = this.formBuilder.group({
      staff_id: ['', Validators.required],
      required_loan_amount: [0, Validators.required],
      loan_purpose: ['', Validators.required]
    });
    
    // Set flag to indicate forms are initialized
    this.formsInitialized = true;
  }

  loadStaffMembers(): void {
    this.userService.getUsers().subscribe({
      next: (response) => {
        // Filter out paused users and only include active users
        this.staffMembers = response.users.filter((user: any) => 
          (user.role === 'user' || user.role === 'admin') && 
          (user.status !== 'paused')
        );
      },
      error: (error) => {
        console.error('Error loading staff members:', error);
      }
    });
  }

  onFileSelected(event: any, fieldName: string): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadedFiles[fieldName] = file;
      console.log(`File selected for ${fieldName}:`, file.name);
      console.log('All uploaded files after selection:', this.uploadedFiles);
      
      // Update form validation for business PAN document
      if (fieldName === 'business_pan_document') {
        this.step2Form.get('business_pan_document')?.setValue(file.name);
      }
      
      // Trigger change detection to update Next button state
      this.step2Form.updateValueAndValidity();
      
      // Force Angular change detection
      setTimeout(() => {
        console.log('Can proceed to next step:', this.canProceedToNextStep());
      }, 100);
    }
  }

  removeFile(fieldName: string): void {
    if (this.uploadedFiles[fieldName]) {
      delete this.uploadedFiles[fieldName];
      console.log(`File removed for ${fieldName}`);
      
      // Clear form validation for business PAN document
      if (fieldName === 'business_pan_document') {
        this.step2Form.get('business_pan_document')?.setValue('');
      }
      
      // Reset the file input - find all matching inputs and reset them
      const fileInputs = document.querySelectorAll(`input[type="file"][data-field="${fieldName}"]`) as NodeListOf<HTMLInputElement>;
      fileInputs.forEach(input => {
        input.value = '';
      });
      
      // Also try to find inputs by change event listener
      const allFileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>;
      allFileInputs.forEach(input => {
        if (input.getAttribute('data-field') === fieldName) {
          input.value = '';
        }
      });
      
      // Trigger change detection to update Next button state and UI
      this.step2Form.updateValueAndValidity();
      
      // Force Angular change detection
      setTimeout(() => {
        // This ensures the UI updates properly
      }, 0);
    }
  }


  onBusinessPanChange(value: boolean): void {
    this.hasBusinessPan = value;
    if (value) {
      this.step2Form.get('business_pan_document')?.setValidators([Validators.required]);
    } else {
      this.step2Form.get('business_pan_document')?.clearValidators();
    }
    this.step2Form.get('business_pan_document')?.updateValueAndValidity();
  }

  onPartnerNumberChange(value: number): void {
    this.numberOfPartners = value;
    
    // Remove existing partner form controls
    Object.keys(this.step2Form.controls).forEach(key => {
      if (key.startsWith('partner_') && (key.includes('_name') || key.includes('_dob'))) {
        this.step2Form.removeControl(key);
      }
    });
    
    // Add form controls for each partner (name and DOB)
    for (let i = 0; i < value; i++) {
      this.step2Form.addControl(`partner_${i}_name`, this.formBuilder.control('', Validators.required));
      this.step2Form.addControl(`partner_${i}_dob`, this.formBuilder.control('', Validators.required));
    }
  }

  onStateChange(selectedState: string): void {
    this.selectedState = selectedState;
    this.filteredDistricts = this.stateDistrictMapping[selectedState] || [];
    
    // Reset district selection when state changes
    this.step1Form.get('district')?.setValue('');
  }

  get states(): string[] {
    return Object.keys(this.stateDistrictMapping).sort();
  }

  nextStep(): void {
    if (this.canProceedToNextStep()) {
      this.currentStep++;
    } else {
      this.markFormGroupTouched(this.getCurrentStepForm());
    }
  }

  canProceedToNextStep(): boolean {
    switch (this.currentStep) {
      case 0:
        return this.step1Form.valid && !!this.uploadedFiles['gst_document'];
      case 1:
        return this.step2Form.valid && this.validateStep2Documents();
      case 2:
        return this.step3Form.valid && this.validateBankStatements();
      case 3:
        return this.step4Form.valid;
      default:
        return false;
    }
  }

  validateStep2Documents(): boolean {
    console.log('Validating Step 2 Documents');
    console.log('Constitution Type:', this.constitutionType);
    console.log('Has Business PAN:', this.hasBusinessPan);
    console.log('Uploaded Files:', this.uploadedFiles);
    console.log('Number of Partners:', this.numberOfPartners);
    
    // For Private Limited: Business PAN document + Owner documents required
    if (this.constitutionType === 'Private Limited') {
      const isValid = !!this.uploadedFiles['business_pan_document'] && 
                     !!this.uploadedFiles['owner_aadhar'] && 
                     !!this.uploadedFiles['owner_pan'];
      console.log('Private Limited validation:', isValid);
      return isValid;
    }
    
    // For Proprietorship: Owner documents always required
    if (this.constitutionType === 'Proprietorship') {
      const ownerDocsValid = !!this.uploadedFiles['owner_aadhar'] && !!this.uploadedFiles['owner_pan'];
      console.log('Owner docs valid:', ownerDocsValid);
      
      // If Business PAN is Yes, also need Business PAN document
      if (this.hasBusinessPan) {
        const isValid = ownerDocsValid && !!this.uploadedFiles['business_pan_document'];
        console.log('Proprietorship with Business PAN validation:', isValid);
        return isValid;
      }
      console.log('Proprietorship without Business PAN validation:', ownerDocsValid);
      return ownerDocsValid;
    }
    
    // For Partnership: Partner documents required
    if (this.constitutionType === 'Partnership') {
      let partnerDocsValid = true;
      for (let i = 0; i < this.numberOfPartners; i++) {
        const hasAadhar = !!this.uploadedFiles[`partner_${i}_aadhar`];
        const hasPan = !!this.uploadedFiles[`partner_${i}_pan`];
        console.log(`Partner ${i} - Aadhar: ${hasAadhar}, PAN: ${hasPan}`);
        
        if (!hasAadhar || !hasPan) {
          partnerDocsValid = false;
          break;
        }
      }
      console.log('Partner docs valid:', partnerDocsValid);
      
      // If Business PAN is Yes, also need Business PAN document
      if (this.hasBusinessPan) {
        const isValid = partnerDocsValid && !!this.uploadedFiles['business_pan_document'];
        console.log('Partnership with Business PAN validation:', isValid);
        return isValid;
      }
      console.log('Partnership without Business PAN validation:', partnerDocsValid);
      return partnerDocsValid;
    }
    
    console.log('Default validation: true');
    return true;
  }

  validateBankStatements(): boolean {
    // At least one bank statement is required
    return this.bankStatements.some(statement => statement.file !== null);
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  getCurrentStepForm(): any {
    switch (this.currentStep) {
      case 0: return this.step1Form;
      case 1: return this.step2Form;
      case 2: return this.step3Form;
      case 3: return this.step4Form;
      default: return null;
    }
  }

  markFormGroupTouched(formGroup: any): void {
    if (formGroup) {
      Object.keys(formGroup.controls).forEach(key => {
        const control = formGroup.get(key);
        control?.markAsTouched();
        if (control?.controls) {
          this.markFormGroupTouched(control);
        }
      });
    }
  }


  onSubmit(): void {
    if (!this.step4Form.valid) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const formData = new FormData();
    
    // Combine all form data
    const allData = {
      ...this.step1Form.value,
      ...this.step2Form.value,
      ...this.step3Form.value,
      ...this.step4Form.value,
      constitution_type: this.constitutionType,
      number_of_partners: this.numberOfPartners,
      has_business_pan: this.hasBusinessPan
    };
    
    // Add form fields
    Object.keys(allData).forEach(key => {
      formData.append(key, allData[key]);
    });

    // Add uploaded files
    Object.keys(this.uploadedFiles).forEach(key => {
      formData.append(key, this.uploadedFiles[key]);
    });

    // Add bank statement files
    this.bankStatements.forEach((statement, index) => {
      if (statement.file) {
        formData.append(`bank_statement_${index}`, statement.file);
      }
    });

    this.clientService.createClient(formData).subscribe({
      next: (response) => {
        this.success = 'Client created successfully!';
        setTimeout(() => {
          this.router.navigate(['/clients']);
        }, 2000);
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to create client';
        this.loading = false;
      }
    });
  }

  convertNumberToWords(num: number): string {
    if (num === 0) return 'Zero';
    if (isNaN(num) || num < 0) return '';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertHundreds = (n: number): string => {
      if (n === 0) return '';
      let result = '';
      
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred';
        n %= 100;
        if (n > 0) result += ' ';
      }
      
      if (n >= 20) {
        result += tens[Math.floor(n / 10)];
        n %= 10;
        if (n > 0) {
          result += ' ' + ones[n];
        }
      } else if (n >= 10) {
        result += teens[n - 10];
      } else if (n > 0) {
        result += ones[n];
      }
      
      return result.trim();
    };

    let result = '';
    
    if (num >= 10000000) {
      const crores = Math.floor(num / 10000000);
      result += convertHundreds(crores) + ' Crore';
      num %= 10000000;
      if (num > 0) result += ' ';
    }
    
    if (num >= 100000) {
      const lakhs = Math.floor(num / 100000);
      result += convertHundreds(lakhs) + ' Lakh';
      num %= 100000;
      if (num > 0) result += ' ';
    }
    
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      result += convertHundreds(thousands) + ' Thousand';
      num %= 1000;
      if (num > 0) result += ' ';
    }
    
    if (num > 0) {
      result += convertHundreds(num);
    }
    
    return result.trim();
  }

  getPartnerArray(): number[] {
    return Array.from({length: this.numberOfPartners}, (_, i) => i + 1);
  }

  filterBankNames(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '' || searchTerm.length < 2) {
      this.filteredBankNames = [];
    } else {
      this.filteredBankNames = this.bankNames.filter(bank =>
        bank.toLowerCase().includes(searchTerm.toLowerCase().trim())
      ).slice(0, 10);
    }
  }

  onBankNameInput(event: any): void {
    const value = event.target.value;
    this.filterBankNames(value);
  }

  selectBank(bankName: string): void {
    this.step3Form.get('bank_name')?.setValue(bankName);
    this.filteredBankNames = [];
  }

  onCreditAmountChange(event: any): void {
    const value = event.target.value.replace(/[^0-9]/g, '');
    event.target.value = value;
    this.totalCreditAmount = value;
    // The form control is already updated automatically since we're using formControlName
  }

  getCreditAmountInWords(): string {
    const amount = this.step3Form.get('total_credit_amount')?.value || this.totalCreditAmount;
    if (amount && !isNaN(parseInt(amount)) && parseInt(amount) > 0) {
      return this.convertNumberToWords(parseInt(amount)) + ' Rupees';
    }
    return '';
  }

  onLoanAmountChange(event: any): void {
    const value = event.target.value.replace(/[^0-9]/g, '');
    event.target.value = value;
    this.step4Form.get('required_loan_amount')?.setValue(value);
  }

  getLoanAmountInWords(): string {
    const amount = this.step4Form.get('required_loan_amount')?.value;
    if (amount && !isNaN(amount) && amount > 0) {
      return this.convertNumberToWords(parseInt(amount)) + ' Rupees';
    }
    return '';
  }

  // Bank Statement Management
  addBankStatement(): void {
    if (this.bankStatements.length < 6) {
      this.bankStatements.push({ file: null });
    }
  }

  removeBankStatement(index: number): void {
    if (this.bankStatements.length > 1) {
      this.bankStatements.splice(index, 1);
    }
  }

  onBankStatementSelected(event: any, index: number): void {
    const file = event.target.files[0];
    if (file) {
      this.bankStatements[index].file = file;
    }
  }

  canAddBankStatement(): boolean {
    return this.bankStatements.every(statement => statement.file !== null);
  }

  // Business PAN Management
  onConstitutionChange(value: string): void {
    this.constitutionType = value;
    
    if (value === 'Private Limited') {
      this.hasBusinessPan = true;
      this.step2Form.get('has_business_pan')?.setValue('yes');
      this.step2Form.get('has_business_pan')?.disable();
      this.setBusinessPanValidation(true);
    } else {
      this.step2Form.get('has_business_pan')?.enable();
      this.step2Form.get('has_business_pan')?.setValue('no');
      this.hasBusinessPan = false;
      this.setBusinessPanValidation(false);
    }
  }

  onBusinessPanToggle(): void {
    const hasBusinessPan = this.step2Form.get('has_business_pan')?.value;
    this.hasBusinessPan = hasBusinessPan === 'yes';
    this.setBusinessPanValidation(this.hasBusinessPan);
  }

  setBusinessPanValidation(required: boolean): void {
    console.log('Setting Business PAN validation:', required);
    console.log('Constitution Type:', this.constitutionType);
    console.log('Has Business PAN:', this.hasBusinessPan);
    
    const businessPanFields = ['business_pan_name', 'business_pan_date'];
    const ownerFields = ['owner_name', 'owner_dob'];
    
    // Business PAN fields validation
    businessPanFields.forEach(field => {
      const control = this.step2Form.get(field);
      if (required && (this.hasBusinessPan || this.constitutionType === 'Private Limited')) {
        control?.setValidators([Validators.required]);
        console.log(`Setting ${field} as required`);
      } else {
        control?.clearValidators();
        console.log(`Clearing validators for ${field}`);
      }
      control?.updateValueAndValidity();
    });
    
    // Owner fields are required for Proprietorship (regardless of Business PAN) or Private Limited
    const ownerRequired = this.constitutionType === 'Proprietorship' || 
                         this.constitutionType === 'Private Limited';
    
    ownerFields.forEach(field => {
      const control = this.step2Form.get(field);
      if (ownerRequired) {
        control?.setValidators([Validators.required]);
        console.log(`Setting ${field} as required for owner`);
      } else {
        control?.clearValidators();
        console.log(`Clearing validators for ${field}`);
      }
      control?.updateValueAndValidity();
    });
    
    // Document fields are handled separately - they don't need form validators
    // since we validate them through uploadedFiles object
    const documentFields = ['business_pan_document', 'owner_aadhar', 'owner_pan'];
    documentFields.forEach(field => {
      const control = this.step2Form.get(field);
      control?.clearValidators();
      control?.updateValueAndValidity();
    });
    
    console.log('Form valid after validation setup:', this.step2Form.valid);
  }

  debugNextButton(): void {
    console.log('Debug Next Button clicked');
    console.log('Current Step:', this.currentStep);
    console.log('Can Proceed:', this.canProceedToNextStep());
    console.log('Step2 Form Valid:', this.step2Form.valid);
    console.log('Step2 Documents Valid:', this.validateStep2Documents());
  }

  getDebugInfo(): string {
    if (this.currentStep === 1) {
      console.log('Step2 Form Status:', this.step2Form.status);
      console.log('Step2 Form Errors:', this.step2Form.errors);
      console.log('Step2 Form Controls:');
      Object.keys(this.step2Form.controls).forEach(key => {
        const control = this.step2Form.get(key);
        console.log(`  ${key}: valid=${control?.valid}, value=${control?.value}, errors=`, control?.errors);
      });
      return `Form: ${this.step2Form.valid}, Docs: ${this.validateStep2Documents()}`;
    }
    return 'N/A';
  }

  get Object() {
    return Object;
  }

  // New Current Account Management
  onNewCurrentAccountChange(value: string): void {
    this.hasNewCurrentAccount = value === 'yes';
    
    if (this.hasNewCurrentAccount) {
      // Set validators for new bank details fields
      this.step3Form.get('new_bank_account_number')?.setValidators([Validators.required]);
      this.step3Form.get('new_ifsc_code')?.setValidators([Validators.required]);
      this.step3Form.get('new_account_name')?.setValidators([Validators.required]);
      this.step3Form.get('new_bank_name')?.setValidators([Validators.required]);
    } else {
      // Clear validators and values for new bank details fields
      this.step3Form.get('new_bank_account_number')?.clearValidators();
      this.step3Form.get('new_ifsc_code')?.clearValidators();
      this.step3Form.get('new_account_name')?.clearValidators();
      this.step3Form.get('new_bank_name')?.clearValidators();
      
      this.step3Form.get('new_bank_account_number')?.setValue('');
      this.step3Form.get('new_ifsc_code')?.setValue('');
      this.step3Form.get('new_account_name')?.setValue('');
      this.step3Form.get('new_bank_name')?.setValue('');
    }
    
    // Update validity
    this.step3Form.get('new_bank_account_number')?.updateValueAndValidity();
    this.step3Form.get('new_ifsc_code')?.updateValueAndValidity();
    this.step3Form.get('new_account_name')?.updateValueAndValidity();
    this.step3Form.get('new_bank_name')?.updateValueAndValidity();
  }

  onNewBankNameInput(event: any): void {
    const value = event.target.value;
    this.filterNewBankNames(value);
  }

  filterNewBankNames(searchTerm: string): void {
    if (!searchTerm || searchTerm.trim() === '' || searchTerm.length < 2) {
      this.filteredNewBankNames = [];
    } else {
      this.filteredNewBankNames = this.bankNames.filter(bank =>
        bank.toLowerCase().includes(searchTerm.toLowerCase().trim())
      ).slice(0, 10);
    }
  }

  selectNewBank(bankName: string): void {
    this.step3Form.get('new_bank_name')?.setValue(bankName);
    this.filteredNewBankNames = [];
  }

  goBack(): void {
    window.history.back();
  }

  /**
   * Extract data from GST document and fill form fields
   */
  extractGstData(): void {
    if (this.isExtractingData) {
      return; // Prevent multiple simultaneous requests
    }
    
    if (!this.uploadedFiles['gst_document']) {
      this.error = 'Please upload a GST document first';
      return;
    }
    
    this.isExtractingData = true;
    this.error = '';
    this.success = '';
    
    // Create FormData with the GST document
    const formData = new FormData();
    formData.append('gst_document', this.uploadedFiles['gst_document']);
    
    // Extract data directly from the document
    this.clientService.extractGstDataDirect(formData).subscribe({
      next: (response) => {
        this.isExtractingData = false;
        if (response.success && response.extracted_data) {
          this.extractedData = response.extracted_data;
          this.fillFormWithExtractedData(response.extracted_data);
          this.success = 'GST data extracted successfully!';
        } else {
          this.error = response.error || 'Failed to extract GST data';
        }
      },
      error: (error) => {
        this.isExtractingData = false;
        this.error = error.message || 'Failed to extract GST data. Please make sure the backend service is running and try again.';
        console.error('Error extracting GST data:', error);
      }
    });
  }
  
  /**
   * Fill form fields with extracted data
   */
  fillFormWithExtractedData(data: any): void {
    console.log('Filling form with extracted data:', data);
    
    // Fill GST details
    if (data.registration_number) {
      this.step1Form.get('registration_number')?.setValue(data.registration_number);
    }
    
    // Only set legal name if it exists in the extracted data
    if (data.legal_name) {
      this.step1Form.get('legal_name')?.setValue(data.legal_name);
    }
    
    // Only set trade name if it exists in the extracted data
    if (data.trade_name) {
      this.step1Form.get('trade_name')?.setValue(data.trade_name);
    }
    
    // Only set address if it exists in the extracted data
    if (data.address) {
      this.step1Form.get('address')?.setValue(data.address);
    }
    
    // Only set state if it exists in the extracted data
    if (data.state) {
      this.step1Form.get('state')?.setValue(data.state);
      this.onStateChange(data.state); // Trigger district filtering
    }
    
    // Only set district if it exists in the extracted data
    if (data.district) {
      this.step1Form.get('district')?.setValue(data.district);
    }
    
    // Only set pincode if it exists in the extracted data
    if (data.pincode) {
      this.step1Form.get('pincode')?.setValue(data.pincode);
    }
    
    // Only set GST status if it exists in the extracted data
    if (data.gst_status) {
      this.step1Form.get('gst_status')?.setValue(data.gst_status);
    }
    
    // Only set business/constitution type if it exists in the extracted data
    if (data.business_type) {
      this.step1Form.get('constitution_type')?.setValue(data.business_type);
    }
    
    // Force validation update
    this.step1Form.updateValueAndValidity();
  }
}
