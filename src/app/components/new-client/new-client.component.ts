import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientService } from '../../services/client.service';
import { UserService, User } from '../../services/user.service';
import { EnquiryService } from '../../services/enquiry.service';

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
  
  // Enquiry data from session storage
  enquiryData: any = null;
  originalEnquiryData: any = null; // Store original enquiry data for sync back
  businessDocumentFromEnquiry: string | null = null;
  
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
  
  // Custom dropdown properties
  isStateDropdownOpen = false;
  isDistrictDropdownOpen = false;
  isBankAccountTypeDropdownOpen = false;
  isTransactionMonthsDropdownOpen = false;
  isStaffDropdownOpen = false;
  
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
    private userService: UserService,
    private enquiryService: EnquiryService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.initializeForms();
    this.loadStaffMembers();
    this.filteredBankNames = [];
    this.loadEnquiryData();
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
      bank_type: ['Current', Validators.required], // Default to Current account type
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
    
    // Pre-fill forms with enquiry data if available
    if (this.enquiryData) {
      this.prefillFormsWithEnquiryData();
    }
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

  loadEnquiryData(): void {
    // Check if there's enquiry data in session storage
    const enquiryDataStr = sessionStorage.getItem('enquiry_data_for_client');
    if (enquiryDataStr) {
      try {
        this.enquiryData = JSON.parse(enquiryDataStr);
        console.log('Loaded enquiry data:', this.enquiryData);
        
        // Show success message about data loading
        this.success = `Pre-filled with data from verified enquiry for ${this.enquiryData.owner_name}`;
        
        // Pre-fill the forms with enquiry data
        this.prefillFormsWithEnquiryData();
        
        // Clear the session storage after loading
        sessionStorage.removeItem('enquiry_data_for_client');
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          this.success = '';
        }, 5000);
      } catch (error) {
        console.error('Error parsing enquiry data:', error);
        sessionStorage.removeItem('enquiry_data_for_client');
        this.error = 'Failed to load enquiry data. Please fill the form manually.';
        setTimeout(() => {
          this.error = '';
        }, 5000);
      }
    }
  }

  prefillFormsWithEnquiryData(): void {
    if (!this.enquiryData || !this.formsInitialized) {
      return;
    }

    console.log('Pre-filling forms with enquiry data:', this.enquiryData);

    // Pre-fill Step 1 form (Basic Info & GST)
    if (this.step1Form) {
      const step1Updates: any = {};
      
      // Map business name to trade name
      if (this.enquiryData.business_name) {
        step1Updates.trade_name = this.enquiryData.business_name;
        step1Updates.legal_name = this.enquiryData.business_name; // Also set legal name
      }
      
      // Map email address
      if (this.enquiryData.email_address) {
        step1Updates.user_email = this.enquiryData.email_address;
      }
      
      // Map mobile number (remove country code if present)
      if (this.enquiryData.mobile_number) {
        const originalMobile = this.enquiryData.mobile_number;
        const extractedMobile = this.extractTenDigitMobile(originalMobile);
        console.log(`Mobile number processing: "${originalMobile}" -> "${extractedMobile}"`);
        step1Updates.mobile_number = extractedMobile;
      }
      
      // Map GST information if available
      if (this.enquiryData.gst) {
        if (this.enquiryData.gst === 'Yes') {
          step1Updates.gst_status = 'Active';
          if (this.enquiryData.gst_status) {
            step1Updates.gst_status = this.enquiryData.gst_status;
          }
        }
      }
      
      // Map annual revenue if available
      if (this.enquiryData.annual_revenue) {
        step1Updates.annual_revenue = this.enquiryData.annual_revenue;
      }
      
      this.step1Form.patchValue(step1Updates);
      console.log('Step 1 form updated with:', step1Updates);
    }

    // Pre-fill Step 2 form (Owner name and business details)
    if (this.step2Form) {
      const step2Updates: any = {};
      
      if (this.enquiryData.owner_name) {
        step2Updates.owner_name = this.enquiryData.owner_name;
      }
      
      // Map business type if available
      if (this.enquiryData.business_type) {
        // Map enquiry business type to constitution type
        const businessTypeMapping: { [key: string]: string } = {
          'Private Limited': 'Private Limited Company',
          'Proprietorship': 'Proprietorship',
          'Partnership': 'Partnership'
        };
        
        if (businessTypeMapping[this.enquiryData.business_type]) {
          this.constitutionType = businessTypeMapping[this.enquiryData.business_type];
          step2Updates.constitution_type = this.constitutionType;
        }
      }
      
      this.step2Form.patchValue(step2Updates);
      console.log('Step 2 form updated with:', step2Updates);
    }

    // Pre-fill Step 4 form (Loan details)
    if (this.step4Form) {
      const step4Updates: any = {};
      
      if (this.enquiryData.loan_amount) {
        // Parse loan amount if it's a string with currency symbols
        let loanAmount = this.enquiryData.loan_amount;
        if (typeof loanAmount === 'string') {
          // Remove currency symbols and convert to number if possible
          const numericAmount = loanAmount.replace(/[₹,\s]/g, '');
          if (!isNaN(Number(numericAmount))) {
            step4Updates.required_loan_amount = Number(numericAmount);
          } else {
            step4Updates.required_loan_amount = loanAmount; // Keep as string if can't parse
          }
        } else {
          step4Updates.required_loan_amount = loanAmount;
        }
      }
      
      if (this.enquiryData.loan_purpose) {
        step4Updates.loan_purpose = this.enquiryData.loan_purpose;
      }
      
      this.step4Form.patchValue(step4Updates);
      console.log('Step 4 form updated with:', step4Updates);
    }

    // Handle business document if available
    if (this.enquiryData.business_document_url) {
      this.businessDocumentFromEnquiry = this.enquiryData.business_document_url;
      console.log('Business document from enquiry:', this.businessDocumentFromEnquiry);
    }
    
    // Store original enquiry data for sync back functionality
    this.originalEnquiryData = { ...this.enquiryData };
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
      has_business_pan: this.hasBusinessPan,
      // Include enquiry_id if this client was created from an enquiry
      ...(this.enquiryData?.enquiry_id && { enquiry_id: this.enquiryData.enquiry_id })
    };
    
    // Add form fields
    Object.keys(allData).forEach(key => {
      formData.append(key, allData[key]);
    });

    // Add uploaded files
    Object.keys(this.uploadedFiles).forEach(key => {
      formData.append(key, this.uploadedFiles[key]);
    });

    // Add business document URL from enquiry if available
    if (this.businessDocumentFromEnquiry) {
      formData.append('business_document_from_enquiry', this.businessDocumentFromEnquiry);
    }

    // Add bank statement files
    this.bankStatements.forEach((statement, index) => {
      if (statement.file) {
        formData.append(`bank_statement_${index}`, statement.file);
      }
    });

    this.clientService.createClient(formData).subscribe({
      next: (response) => {
        this.success = 'Client created successfully!';
        
        // Sync data back to enquiry if this came from an enquiry
        if (this.enquiryData?.enquiry_id) {
          this.syncClientDataBackToEnquiry(response.client, this.enquiryData.enquiry_id);
        }
        
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

  // Custom dropdown methods
  toggleStateDropdown(): void {
    this.isStateDropdownOpen = !this.isStateDropdownOpen;
    if (this.isStateDropdownOpen) {
      this.isDistrictDropdownOpen = false;
    }
  }

  toggleDistrictDropdown(): void {
    if (this.selectedState) {
      this.isDistrictDropdownOpen = !this.isDistrictDropdownOpen;
      if (this.isDistrictDropdownOpen) {
        this.isStateDropdownOpen = false;
      }
    }
  }

  selectState(state: string): void {
    this.step1Form.patchValue({ state: state });
    this.onStateChange(state);
    this.isStateDropdownOpen = false;
  }

  selectDistrict(district: string): void {
    this.step1Form.patchValue({ district: district });
    this.isDistrictDropdownOpen = false;
  }

  getStateLabel(value: string): string {
    if (!value) return 'Select State';
    return value;
  }

  getDistrictLabel(value: string): string {
    if (!value) return 'Select District';
    if (!this.selectedState) return 'Select State First';
    return value;
  }

  // Bank Account Type dropdown methods
  toggleBankAccountTypeDropdown(): void {
    this.isBankAccountTypeDropdownOpen = !this.isBankAccountTypeDropdownOpen;
    if (this.isBankAccountTypeDropdownOpen) {
      this.isStateDropdownOpen = false;
      this.isDistrictDropdownOpen = false;
    }
  }

  selectBankAccountType(type: string): void {
    this.step3Form.patchValue({ bank_type: type });
    this.isBankAccountTypeDropdownOpen = false;
  }

  getBankAccountTypeLabel(value: string): string {
    if (!value) return 'Select Account Type';
    return value;
  }

  // Transaction Months dropdown methods
  toggleTransactionMonthsDropdown(): void {
    this.isTransactionMonthsDropdownOpen = !this.isTransactionMonthsDropdownOpen;
    if (this.isTransactionMonthsDropdownOpen) {
      this.isStateDropdownOpen = false;
      this.isDistrictDropdownOpen = false;
      this.isBankAccountTypeDropdownOpen = false;
    }
  }

  selectTransactionMonths(months: number): void {
    this.step3Form.patchValue({ transaction_months: months });
    this.isTransactionMonthsDropdownOpen = false;
  }

  getTransactionMonthsLabel(value: number): string {
    if (!value) return 'Select Transaction Months';
    return `${value} Months`;
  }

  // Staff dropdown methods
  toggleStaffDropdown(): void {
    this.isStaffDropdownOpen = !this.isStaffDropdownOpen;
    if (this.isStaffDropdownOpen) {
      this.isStateDropdownOpen = false;
      this.isDistrictDropdownOpen = false;
      this.isBankAccountTypeDropdownOpen = false;
      this.isTransactionMonthsDropdownOpen = false;
    }
  }

  selectStaff(staffId: string): void {
    this.step4Form.patchValue({ staff_id: staffId });
    this.isStaffDropdownOpen = false;
  }

  getStaffLabel(staffId: string): string {
    if (!staffId) return 'Select Staff Member';
    const staff = this.staffMembers.find(s => s._id === staffId);
    return staff ? `${staff.username} (${staff.email})` : 'Select Staff Member';
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.isStateDropdownOpen = false;
      this.isDistrictDropdownOpen = false;
      this.isBankAccountTypeDropdownOpen = false;
      this.isTransactionMonthsDropdownOpen = false;
      this.isStaffDropdownOpen = false;
    }
  }

  getBusinessDocumentStatus(): string {
    // Check if there's a business document from enquiry
    if (this.businessDocumentFromEnquiry) {
      return 'Yes (From Enquiry)';
    }
    
    // Check if there's an uploaded business document
    if (this.uploadedFiles['business_document']) {
      return 'Yes (Uploaded)';
    }
    
    return 'No';
  }

  viewBusinessDocument(): void {
    if (this.businessDocumentFromEnquiry) {
      // Open the business document URL in a new tab
      window.open(this.businessDocumentFromEnquiry, '_blank');
    }
  }

  isFieldPreFilled(fieldName: string): boolean {
    if (!this.enquiryData) return false;
    
    const fieldMappings: { [key: string]: string } = {
      'trade_name': 'business_name',
      'user_email': 'email_address',
      'mobile_number': 'mobile_number',
      'owner_name': 'owner_name',
      'required_loan_amount': 'loan_amount',
      'loan_purpose': 'loan_purpose'
    };
    
    const enquiryField = fieldMappings[fieldName];
    return enquiryField && this.enquiryData[enquiryField] && this.enquiryData[enquiryField].toString().trim() !== '';
  }

  getPreFilledFieldClass(fieldName: string): string {
    return this.isFieldPreFilled(fieldName) ? 'border-green-300 bg-green-50' : '';
  }

  formatMobileNumber(mobile: string): string {
    if (!mobile) return '';
    // Format as XXX-XXX-XXXX
    const cleaned = mobile.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return mobile;
  }

  extractTenDigitMobile(mobile: string): string {
    if (!mobile) return '';
    
    // Remove all non-digit characters
    const cleaned = mobile.replace(/\D/g, '');
    
    // Handle different mobile number formats
    if (cleaned.length === 10) {
      // Already 10 digits, return as is
      return cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      // Remove +91 country code (91xxxxxxxxxx)
      return cleaned.substring(2);
    } else if (cleaned.length === 13 && cleaned.startsWith('091')) {
      // Remove 091 country code (091xxxxxxxxxx)
      return cleaned.substring(3);
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      // Remove leading 0 (0xxxxxxxxxx)
      return cleaned.substring(1);
    } else if (cleaned.length > 10) {
      // Take the last 10 digits (handles various country code formats)
      return cleaned.substring(cleaned.length - 10);
    }
    
    // If less than 10 digits or other format, return as is
    return cleaned;
  }

  updateEnquiryAsSubmitted(enquiryId: string): void {
    // Update the enquiry to mark it as client_submitted = true
    this.enquiryService.updateEnquiry(enquiryId, { client_submitted: true }).subscribe({
      next: (response) => {
        console.log('Enquiry marked as submitted:', response);
      },
      error: (error) => {
        console.error('Error updating enquiry status:', error);
        // Don't show error to user as client creation was successful
      }
    });
  }

  // Business Document Methods
  showBusinessDocumentUpload = false;

  shouldShowBusinessDocumentField(): boolean {
    // Always show business document field in step 2 (optional upload)
    // This allows users to upload business documents even if not uploaded during enquiry
    return true;
  }

  previewEnquiryDocument(): void {
    const documentUrl = this.enquiryData?.business_document_url;
    if (!documentUrl) {
      this.snackBar.open('Document URL not available', 'Close', { duration: 3000 });
      return;
    }

    console.log('📄 Previewing enquiry document:', documentUrl);

    // Check if it's a PDF by URL extension or file format
    // Enhanced PDF detection for Cloudinary uploads
    const isPdf = documentUrl.toLowerCase().includes('.pdf') || 
                  documentUrl.includes('pdf') ||
                  // Assume business documents are PDFs unless clearly an image format
                  (!documentUrl.toLowerCase().includes('.jpg') && 
                   !documentUrl.toLowerCase().includes('.jpeg') && 
                   !documentUrl.toLowerCase().includes('.png') && 
                   !documentUrl.toLowerCase().includes('.gif') &&
                   !documentUrl.toLowerCase().includes('.webp') &&
                   !documentUrl.toLowerCase().includes('.doc') &&
                   !documentUrl.toLowerCase().includes('.docx'));
    
    if (isPdf) {
      // Create a more robust PDF preview
      this.previewPdfDocument(documentUrl);
    } else {
      // For images and other documents, use direct opening
      this.previewImageDocument(documentUrl);
    }
  }

  // Preview PDF documents with better handling
  private previewPdfDocument(documentUrl: string): void {
    try {
      // Optimize Cloudinary URL for PDF viewing
      const optimizedUrl = this.optimizeCloudinaryPdfUrl(documentUrl);
      console.log('Original URL:', documentUrl);
      console.log('Optimized URL:', optimizedUrl);

      // Try to open PDF in a new window with multiple fallback methods
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>PDF Preview - Enquiry Document</title>
              <style>
                body, html { 
                  margin: 0; 
                  padding: 0; 
                  height: 100%; 
                  overflow: hidden; 
                  background: #525659;
                  font-family: Arial, sans-serif;
                }
                .pdf-container {
                  width: 100%;
                  height: 100vh;
                  display: flex;
                  flex-direction: column;
                }
                .pdf-header {
                  background: #323639;
                  color: white;
                  padding: 10px 20px;
                  font-size: 14px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .pdf-viewer {
                  flex: 1;
                  width: 100%;
                  border: none;
                }
                .error-message {
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background: #f5f5f5;
                  color: #333;
                  text-align: center;
                  padding: 20px;
                }
                .retry-btn {
                  background: #2563eb;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 5px;
                  cursor: pointer;
                  margin: 5px;
                  min-width: 120px;
                }
                .retry-btn:hover {
                  background: #1d4ed8;
                }
                .loading-message {
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background: #f5f5f5;
                  color: #333;
                  text-align: center;
                }
              </style>
            </head>
            <body>
              <div class="pdf-container">
                <div class="pdf-header">
                  <span>📄 Enquiry Document Preview</span>
                  <div>
                    <a href="${optimizedUrl}" target="_blank" style="color: #60a5fa; text-decoration: none; margin-right: 15px;">
                      ⬇ Download
                    </a>
                    <button onclick="tryAlternativeViewer()" style="background: #10b981; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                      Alternative View
                    </button>
                  </div>
                </div>
                
                <!-- Loading message -->
                <div id="loadingDiv" class="loading-message">
                  <h3>📄 Loading PDF...</h3>
                  <p>Please wait while the document loads.</p>
                </div>

                <!-- Primary PDF viewer (embed) -->
                <embed id="pdfEmbed" 
                       class="pdf-viewer" 
                       src="${optimizedUrl}" 
                       type="application/pdf"
                       style="display: none;"
                       onload="onPdfLoad()"
                       onerror="tryIframeMethod()">

                <!-- Fallback PDF viewer (iframe) -->
                <iframe id="pdfIframe" 
                        class="pdf-viewer" 
                        src="${optimizedUrl}"
                        style="display: none;"
                        onload="onPdfLoad()"
                        onerror="tryObjectMethod()">
                </iframe>

                <!-- Second fallback (object) -->
                <object id="pdfObject" 
                        class="pdf-viewer" 
                        data="${optimizedUrl}" 
                        type="application/pdf"
                        style="display: none;"
                        onload="onPdfLoad()">
                  <p>Your browser doesn't support PDF viewing.</p>
                </object>

                <!-- Error message -->
                <div id="errorDiv" class="error-message" style="display: none;">
                  <h3>⚠️ Unable to preview PDF</h3>
                  <p>The PDF viewer couldn't load this document.</p>
                  <p><strong>Possible causes:</strong></p>
                  <ul style="text-align: left; max-width: 400px;">
                    <li>Browser security settings blocking the PDF</li>
                    <li>Cloudinary CORS configuration</li>
                    <li>PDF file format issues</li>
                    <li>Network connectivity problems</li>
                  </ul>
                  <div style="margin-top: 20px;">
                    <button class="retry-btn" onclick="window.open('${optimizedUrl}', '_blank')">
                      📱 Open in New Tab
                    </button>
                    <button class="retry-btn" onclick="downloadPdf()">
                      💾 Download PDF
                    </button>
                    <button class="retry-btn" onclick="location.reload()">
                      🔄 Retry Preview
                    </button>
                  </div>
                </div>
              </div>
              
              <script>
                let currentMethod = 0;
                const methods = ['pdfEmbed', 'pdfIframe', 'pdfObject'];
                let loadTimeout;

                function onPdfLoad() {
                  clearTimeout(loadTimeout);
                  document.getElementById('loadingDiv').style.display = 'none';
                  console.log('PDF loaded successfully with method:', methods[currentMethod]);
                }

                function tryNextMethod() {
                  if (currentMethod < methods.length - 1) {
                    // Hide current method
                    document.getElementById(methods[currentMethod]).style.display = 'none';
                    currentMethod++;
                    
                    // Show next method
                    const nextElement = document.getElementById(methods[currentMethod]);
                    nextElement.style.display = 'block';
                    
                    console.log('Trying method:', methods[currentMethod]);
                    
                    // Set timeout for next method
                    loadTimeout = setTimeout(() => {
                      if (currentMethod < methods.length - 1) {
                        tryNextMethod();
                      } else {
                        showError();
                      }
                    }, 4000);
                  } else {
                    showError();
                  }
                }

                function tryIframeMethod() {
                  console.log('Embed method failed, trying iframe...');
                  tryNextMethod();
                }

                function tryObjectMethod() {
                  console.log('Iframe method failed, trying object...');
                  tryNextMethod();
                }

                function showError() {
                  clearTimeout(loadTimeout);
                  document.getElementById('loadingDiv').style.display = 'none';
                  methods.forEach(method => {
                    document.getElementById(method).style.display = 'none';
                  });
                  document.getElementById('errorDiv').style.display = 'flex';
                  console.log('All PDF viewing methods failed');
                }

                function tryAlternativeViewer() {
                  // Try Google Docs viewer as alternative
                  const googleViewerUrl = 'https://docs.google.com/viewer?url=' + encodeURIComponent('${optimizedUrl}') + '&embedded=true';
                  window.open(googleViewerUrl, '_blank');
                }

                function downloadPdf() {
                  const link = document.createElement('a');
                  link.href = '${optimizedUrl}';
                  link.download = 'enquiry-document.pdf';
                  link.target = '_blank';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }

                // Start with first method
                document.getElementById(methods[0]).style.display = 'block';
                
                // Set initial timeout
                loadTimeout = setTimeout(() => {
                  tryNextMethod();
                }, 4000);

                // Hide loading after 10 seconds regardless
                setTimeout(() => {
                  if (document.getElementById('loadingDiv').style.display !== 'none') {
                    document.getElementById('loadingDiv').style.display = 'none';
                  }
                }, 10000);
              </script>
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        // Fallback if popup blocked
        this.fallbackPreview(documentUrl);
      }
    } catch (error) {
      console.error('Error opening PDF preview:', error);
      this.fallbackPreview(documentUrl);
    }
  }

  // Optimize Cloudinary URL for better PDF viewing
  private optimizeCloudinaryPdfUrl(url: string): string {
    try {
      // Check if it's a Cloudinary URL
      if (url.includes('cloudinary.com')) {
        // For PDFs, we want to preserve the raw format without any transformations
        // that might convert it to an image. Just return the original URL.
        // This ensures PDFs are displayed as actual PDFs, not converted to images.
        return url;
      }
      
      // If not Cloudinary, return original URL
      return url;
    } catch (error) {
      console.error('Error processing Cloudinary URL:', error);
      return url;
    }
  }

  // Preview image documents
  private previewImageDocument(documentUrl: string): void {
    try {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Image Preview - Enquiry Document</title>
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
                .error-message {
                  text-align: center;
                  color: #666;
                }
              </style>
            </head>
            <body>
              <img src="${documentUrl}" 
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <div class="error-message" style="display: none;">
                <h3>⚠️ Unable to load image</h3>
                <p>The image could not be displayed.</p>
                <a href="${documentUrl}" target="_blank">View Original</a>
              </div>
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        this.fallbackPreview(documentUrl);
      }
    } catch (error) {
      console.error('Error opening image preview:', error);
      this.fallbackPreview(documentUrl);
    }
  }

  // Fallback preview method
  private fallbackPreview(documentUrl: string): void {
    this.snackBar.open('Opening document in new tab...', 'Close', { duration: 2000 });
    
    // Try direct URL opening as last resort
    try {
      window.open(documentUrl, '_blank');
    } catch (error) {
      console.error('All preview methods failed:', error);
      this.snackBar.open('Unable to preview document. Please check the document URL.', 'Close', { duration: 5000 });
    }
  }

  replaceEnquiryDocument(): void {
    this.showBusinessDocumentUpload = true;
  }

  // Comprehensive sync method to update enquiry with client data
  syncClientDataBackToEnquiry(clientData: any, enquiryId: string): void {
    console.log('Syncing client data back to enquiry:', clientData);
    
    // Prepare updated enquiry data based on client information
    const enquiryUpdates: any = {
      client_submitted: true, // Mark as client created
      client_id: clientData._id, // Link to created client
      updated_at: new Date().toISOString()
    };

    // Sync basic information
    if (clientData.trade_name && clientData.trade_name !== this.originalEnquiryData?.business_name) {
      enquiryUpdates.business_name = clientData.trade_name;
    }

    if (clientData.user_email && clientData.user_email !== this.originalEnquiryData?.email_address) {
      enquiryUpdates.email_address = clientData.user_email;
    }

    if (clientData.mobile_number && clientData.mobile_number !== this.originalEnquiryData?.mobile_number) {
      enquiryUpdates.mobile_number = clientData.mobile_number;
    }

    // Sync business information
    if (clientData.owner_name && clientData.owner_name !== this.originalEnquiryData?.owner_name) {
      enquiryUpdates.owner_name = clientData.owner_name;
    }

    // Map constitution type back to business type
    if (clientData.constitution_type) {
      const constitutionToBusinessTypeMapping: { [key: string]: string } = {
        'Private Limited Company': 'Private Limited',
        'Proprietorship': 'Proprietorship',
        'Partnership': 'Partnership'
      };
      
      const mappedBusinessType = constitutionToBusinessTypeMapping[clientData.constitution_type];
      if (mappedBusinessType && mappedBusinessType !== this.originalEnquiryData?.business_type) {
        enquiryUpdates.business_type = mappedBusinessType;
      }
    }

    // Sync loan information
    if (clientData.required_loan_amount && clientData.required_loan_amount !== this.originalEnquiryData?.loan_amount) {
      // Format loan amount for enquiry (convert number to string with currency if needed)
      if (typeof clientData.required_loan_amount === 'number') {
        enquiryUpdates.loan_amount = `₹${clientData.required_loan_amount.toLocaleString('en-IN')}`;
      } else {
        enquiryUpdates.loan_amount = clientData.required_loan_amount;
      }
    }

    if (clientData.loan_purpose && clientData.loan_purpose !== this.originalEnquiryData?.loan_purpose) {
      enquiryUpdates.loan_purpose = clientData.loan_purpose;
    }

    // Sync GST information
    if (clientData.gst_status) {
      if (clientData.gst_status === 'Active' && this.originalEnquiryData?.gst !== 'Yes') {
        enquiryUpdates.gst = 'Yes';
        enquiryUpdates.gst_status = 'Active';
      } else if (clientData.gst_status !== this.originalEnquiryData?.gst_status) {
        enquiryUpdates.gst_status = clientData.gst_status;
      }
    }

    // Sync business document if uploaded in client form
    if (this.uploadedFiles['business_document'] || clientData.business_document_url) {
      const newDocumentUrl = clientData.business_document_url || clientData.documents?.business_document?.url;
      if (newDocumentUrl && newDocumentUrl !== this.originalEnquiryData?.business_document_url) {
        enquiryUpdates.business_document_url = newDocumentUrl;
      }
    }

    // Only sync if there are actual changes
    const hasChanges = Object.keys(enquiryUpdates).length > 3; // More than just client_submitted, client_id, updated_at
    
    if (hasChanges) {
      console.log('Syncing enquiry updates:', enquiryUpdates);
      
      this.enquiryService.updateEnquiry(enquiryId, enquiryUpdates).subscribe({
        next: (response) => {
          console.log('Enquiry updated successfully with client data:', response);
          this.success += ' Enquiry data synchronized!';
        },
        error: (error) => {
          console.error('Error syncing data back to enquiry:', error);
          // Don't show error to user as client creation was successful
          console.warn('Client created successfully but enquiry sync failed');
        }
      });
    } else {
      // Just mark as submitted
      this.updateEnquiryAsSubmitted(enquiryId);
    }
  }

  // Enhanced method to detect changes between forms and original enquiry data
  getFormChangesForSync(): any {
    if (!this.originalEnquiryData) return {};
    
    const changes: any = {};
    
    // Check Step 1 changes
    if (this.step1Form) {
      const step1Values = this.step1Form.value;
      
      if (step1Values.trade_name !== this.originalEnquiryData.business_name) {
        changes.business_name = step1Values.trade_name;
      }
      
      if (step1Values.user_email !== this.originalEnquiryData.email_address) {
        changes.email_address = step1Values.user_email;
      }
      
      if (step1Values.mobile_number !== this.originalEnquiryData.mobile_number) {
        changes.mobile_number = step1Values.mobile_number;
      }
    }
    
    // Check Step 2 changes
    if (this.step2Form) {
      const step2Values = this.step2Form.value;
      
      if (step2Values.owner_name !== this.originalEnquiryData.owner_name) {
        changes.owner_name = step2Values.owner_name;
      }
    }
    
    // Check Step 4 changes
    if (this.step4Form) {
      const step4Values = this.step4Form.value;
      
      if (step4Values.required_loan_amount !== this.originalEnquiryData.loan_amount) {
        changes.loan_amount = step4Values.required_loan_amount;
      }
      
      if (step4Values.loan_purpose !== this.originalEnquiryData.loan_purpose) {
        changes.loan_purpose = step4Values.loan_purpose;
      }
    }
    
    return changes;
  }

  // Method to sync form changes back to enquiry in real-time (optional)
  syncFormChangesToEnquiry(): void {
    if (!this.enquiryData?.enquiry_id) return;
    
    const changes = this.getFormChangesForSync();
    
    if (Object.keys(changes).length > 0) {
      console.log('Syncing form changes to enquiry:', changes);
      
      this.enquiryService.updateEnquiry(this.enquiryData.enquiry_id, {
        ...changes,
        updated_at: new Date().toISOString()
      }).subscribe({
        next: (response) => {
          console.log('Enquiry updated with form changes:', response);
        },
        error: (error) => {
          console.error('Error syncing form changes to enquiry:', error);
        }
      });
    }
  }
}
