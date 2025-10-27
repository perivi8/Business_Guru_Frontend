# WhatsApp Integration Documentation

## Overview
This document explains how to use the WhatsApp integration feature that allows public users to send a pre-filled "I'm interested!" message to the business without requiring login or registration.

## Public Access Links

### 1. Public WhatsApp Page
- **URL**: `/whatsapp-public`
- **Description**: A user-friendly page that explains how to use the WhatsApp integration and provides a button to initiate the conversation.

### 2. Direct WhatsApp Link Component
- **URL**: `/whatsapp-link`
- **Description**: Direct access to the WhatsApp link component that redirects users to WhatsApp with a pre-filled message.

## How It Works

1. **Public Access**: Users can access the WhatsApp integration without logging in
2. **Pre-filled Message**: When users click the WhatsApp button, they are redirected to WhatsApp with a pre-filled message "Hi I am interested!"
3. **Configured Number**: The message is sent to the WhatsApp number configured in the backend (.env file)
4. **No Registration Required**: Users can send messages without creating an account

## Configuration

The WhatsApp number is configured in the backend `.env` file:
```
# GreenAPI WhatsApp Configuration
GREENAPI_INSTANCE_ID=7105335459
GREENAPI_TOKEN=3a0876a6822049bc8764168532cb912b16ba62dcb2f446eb99
GREENAPI_BASE_URL=https://api.green-api.com
```

The specific number used for public access is `918106811285` (configured in the WhatsApp link component).

## Enquiry Page Modifications

The enquiry page has been modified to improve the user experience:

### Removed Features
- Add Enquiry option (both button and empty state)
- User Name column
- Edit option from Actions column

### Modified Columns
1. **Wati Name Column**: Shows WhatsApp/Wati name
2. **Mobile Number Column**: Shows WhatsApp number with secondary mobile number as optional
3. **Business Type Column**: Shows select options (Private LTD, Proprietorship, Partnership)
4. **Business Nature Column**: Added input option in every row
5. **Staff Column**: Shows select options in every row
6. **Comments Column**: Shows list of comments as select options in every row
7. **Additional Comments Column**: Added text input box in every row
8. **GST Column**: Shows select options (YES/No) with sub-options (Active, Cancel, In Active) when YES is selected

## Testing

To test the WhatsApp integration:
1. Navigate to `/whatsapp-test` to see all available options
2. Click on either the public page or direct link
3. Click the WhatsApp button to be redirected to WhatsApp
4. Verify that the message is pre-filled correctly

## Backend Integration

The WhatsApp integration uses GreenAPI service which allows sending messages without OTP verification. The service is configured in the backend and can be used to send messages to any valid WhatsApp number.

## Security Considerations

- The public WhatsApp link does not require authentication
- The enquiry page modifications maintain appropriate access controls for authenticated users
- All other application features continue to require proper authentication

## Troubleshooting

### Common Issues
1. **WhatsApp not opening**: Ensure the user has WhatsApp installed on their device
2. **Message not pre-filled**: Check that the URL parameters are correctly formatted
3. **Wrong number**: Verify the number in the `.env` file and component configuration

### Support
For issues with the WhatsApp integration, contact the development team with details about the problem and steps to reproduce.