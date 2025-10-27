import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// Material Modules
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatStepperModule } from '@angular/material/stepper';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatListModule } from '@angular/material/list';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RegisterComponent } from './components/register/register.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { TeamComponent } from './components/team/team.component';
import { ClientsComponent } from './components/clients/clients.component';
import { NewClientComponent } from './components/new-client/new-client.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ClientDetailsDialogComponent } from './components/client-details-dialog/client-details-dialog.component';
import { ConfirmDeleteDialogComponent } from './components/confirm-delete-dialog/confirm-delete-dialog.component';
import { ClientDetailComponent } from './components/client-detail/client-detail.component';
import { EditClientComponent } from './components/edit-client/edit-client.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { EnquiryComponent } from './components/enquiry/enquiry.component';
import { EnquiryDetailsComponent } from './components/enquiry-details/enquiry-details.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { AdminApprovalPopupComponent } from './components/admin-approval-popup/admin-approval-popup.component';
import { PublicEnquiryComponent } from './components/public-enquiry/public-enquiry.component';

// Transaction Components
import { TransactionComponent } from './components/transaction/transaction.component';
import { TransactionDialogComponent } from './components/transaction/transaction-dialog.component';
import { ApprovedClientsComponent } from './components/approved-clients/approved-clients.component';

// Interceptors
import { AuthInterceptor } from './interceptors/auth.interceptor';

// Services
import { SocketService } from './services/socket.service';

@NgModule({
  declarations: [
    AppComponent,
    RegisterComponent,
    LoginComponent,
    DashboardComponent,
    AdminDashboardComponent,
    TeamComponent,
    ClientsComponent,
    NewClientComponent,
    NavbarComponent,
    ClientDetailsDialogComponent,
    ConfirmDeleteDialogComponent,
    ClientDetailComponent,
    EditClientComponent,
    NotificationsComponent,
    EnquiryComponent,
    EnquiryDetailsComponent,
    ForgotPasswordComponent,
    AdminApprovalPopupComponent,
    PublicEnquiryComponent,
    TransactionComponent,
    TransactionDialogComponent,
    ApprovedClientsComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    RouterModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MatRadioModule,
    MatStepperModule,
    MatExpansionModule,
    MatDividerModule,
    MatTooltipModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatListModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    SocketService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }