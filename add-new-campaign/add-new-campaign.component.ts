import { Component, Input, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AJSAceService } from 'src/ng2/app/ajs-upgraded-providers';
import { AccountService } from "@appcore/services/account.service";
import { LegendsData } from "@appcore/model/accountsdto";
import { sortBy } from 'lodash';
import swal from 'sweetalert2';
import { NgxSummernoteDirective } from '../../shared/ngx-summernote/ngx-summernote.directive';
import { CommonService } from '@appcore/services/common.service';
import { faInfoCircle } from '@fortawesome/pro-solid-svg-icons';
import { BsModalRef, BsModalService } from 'ngx-bootstrap';
import { ACEService } from '@appcore/services/ace.service';
import { CampaignService } from '@appcore/services/campaign.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { WizardComponent, WizardStep } from 'angular-archwizard';
import { AuthenticationService, LoggedInUser } from '@appcore/authentication';
import { campaignCandidateConfig, CampaignSearchOptions } from '@appcore/model/CampaignModels/campaignDto';

@Component({
	selector: 'app-add-new-campaign',
	templateUrl: './add-new-campaign.component.html',
	styleUrls: ['./add-new-campaign.component.scss']
})
export class AddNewCampaignComponent implements OnInit {

	fa = {faInfoCircle};
	AccountId? : number
	isEdit? : boolean
	isForCopy? : boolean
	singleMailBoxAccount? : boolean
	copySMSTemplate : boolean
	copyEmailTemplate : boolean
	copyCandidates : boolean
	campaignDetails : any = {};
	candidatesList : any;
	templates : object;
	candidatesInTheCampaign = [];
	basicDetailsForm : FormGroup;
	summerNoteConfig: any = {};
	triggerConfigurations: any = {};
	legendsData: any;
	emailLegends: Array<LegendsData>;
	smsLegends: Array<LegendsData>;
	@ViewChild(NgxSummernoteDirective, {static : false}) 
	insertLegends: NgxSummernoteDirective;
	@ViewChild("subject", { static: false }) subject: FormControl;
	@ViewChild("smsBody",{static : false}) smsBody: FormControl;
	@ViewChild('addEditCopyCampaign', { static: false }) addEditCopyCampaign?: WizardComponent;
	@ViewChild('wizardStep', { static: false }) wizardStep?: WizardStep;
	selectedCandidates : []
	smsCampaign: Subscription
	emailCampaign: Subscription
	saveBtnDisabled = true;
	showSecondStep = false;
	campaignSearchOptions: Partial<CampaignSearchOptions> = {};
	CampaignId?: number;
	campaign: object;
	copyCampaignForm: FormGroup;
	subscriptions: Subscription[] = [];
	loggedInUser : LoggedInUser;

	constructor(
		private formBuilder: FormBuilder,
		private aceService: AJSAceService,
		private ACEService: ACEService,
		private accountsService: AccountService,
		private commonService: CommonService,
		public  activeModal : BsModalRef,
		private campaignService: CampaignService,
		private toastr                : ToastrService,
		private modalService          : BsModalService,
		private authenticationService : AuthenticationService,
	) {
		this.basicDetailsForm = this.formBuilder.group({
			'Title' : new FormControl('', [Validators.required]),
			'Description' : new FormControl('', [Validators.required]),
			'EnableSMSCampaign' : new FormControl(true),
			'SMSBody' : new FormControl('', [Validators.required]),
			'EnableEmailCampaign' : new FormControl(false),
			'Subject' : new FormControl(''),
			'EmailBody' : new FormControl(''),
			'Signature' : new FormControl(''),
			'Candidates' : new FormControl([])
		});
		this.copyCampaignForm = this.formBuilder.group({
			smsTemplate : new FormControl(true),
			emailTemplate : new FormControl(true),
			candidates : new FormControl(false),
		});
	}

	ngOnInit() {
		if(!this.isForCopy){
			this.showSecondStep = true;
		}

		this.summerNoteConfig = this.aceService.getSummernoteConfig();
		this.getACETemplateLegends();

		this.smsCampaign = this.basicDetailsForm.get('EnableSMSCampaign').valueChanges.subscribe(value => {
			if (value) {
				this.basicDetailsForm.controls['SMSBody'].setValidators(Validators.required);
			} else {
				this.basicDetailsForm.controls['SMSBody'].clearValidators();
				if(!this.isEdit){
					this.basicDetailsForm.patchValue({SMSBody : null});
				}
			}
			this.basicDetailsForm.controls['SMSBody'].updateValueAndValidity();
		});
	
		this.emailCampaign = this.basicDetailsForm.get('EnableEmailCampaign').valueChanges.subscribe(value => {
			if (value) {
				this.basicDetailsForm.controls['Subject'].setValidators(Validators.required);
				this.basicDetailsForm.controls['EmailBody'].setValidators(Validators.required);
				if(this.singleMailBoxAccount){
					this.basicDetailsForm.controls['Signature'].setValidators(Validators.required);
				}
			} else {
				this.basicDetailsForm.controls['Subject'].clearValidators();
				this.basicDetailsForm.controls['EmailBody'].clearValidators();
				this.basicDetailsForm.controls['Signature'].clearValidators();
				if(!this.isEdit){
					this.basicDetailsForm.patchValue({Subject : null, EmailBody : null, Signature : null});
				}
			}
			this.basicDetailsForm.controls['Subject'].updateValueAndValidity();
			this.basicDetailsForm.controls['EmailBody'].updateValueAndValidity();
			this.basicDetailsForm.controls['Signature'].updateValueAndValidity();
		});
	
		this.selectedCandidates = [];

		if(this.isEdit){
			this.basicDetailsForm.patchValue({
				'Title' : this.campaignDetails.CampaignTitle,
				'Description' : this.campaignDetails.CampaignDescription,
				'EnableSMSCampaign' : this.templates[0].SMSTemplateConfigViewModel.SMSTemplateDetails.IsActive,
				'SMSBody' : this.templates[0].SMSTemplateConfigViewModel.SMSTemplateDetails.SMSBody,
				'EnableEmailCampaign' : this.templates[0].EmailTemplateConfigViewModel.EmailTemplateDetails.IsActive,
				'Subject' : this.templates[0].EmailTemplateConfigViewModel.EmailTemplateDetails.Subject,
				'EmailBody' : this.templates[0].EmailTemplateConfigViewModel.EmailTemplateDetails.EmailBody,
				'Signature' : this.templates[0].EmailTemplateConfigViewModel.EmailTemplateDetails.Signature,
				'Candidates' : this.candidatesList.Candidates
			});
			this.candidatesInTheCampaign = this.candidatesList.Candidates;
			if(this.candidatesInTheCampaign.length>0){
				this.saveBtnDisabled = false;
			}
			this.triggerConfigurations = this.templates;
		}
		else{
			if(!this.isForCopy && !this.isEdit){
				this.getTriggerConfigurations().subscribe((response) => {
					this.triggerConfigurations = response;
				});;
			}
		}


		if(this.isForCopy){
			this.loggedInUser = this.authenticationService.loggedInUser;
			this.campaignSearchOptions.AccountId = this.AccountId;
			this.campaignSearchOptions.campaignId = this.campaignDetails.CampaignId;
			this.campaignSearchOptions.isForCopy = this.isForCopy;
			this.campaign = this.campaignDetails;
		}
	}

	getACETemplateLegends(){
		this.accountsService.getACETemplateLegends({'accountId': this.AccountId}).subscribe((response) => {
			this.legendsData   = sortBy(response, ['IsCustom','LegendName']);
			this.emailLegends  = this.legendsData.filter(data => (data.LegendCategory == 'ctgCampaignLegends'));
			this.smsLegends    = this.legendsData.filter(data => (data.LegendCategory == 'ctgCampaignLegends'));
		});
	}
	
	insertEmailSubjectLegend(inputSelector, legend) {
		this.commonService.insertLegend(inputSelector, legend);
		this.basicDetailsForm.patchValue({
			Subject: (<any>this.subject).nativeElement.value
		});
		this.basicDetailsForm.controls.Subject.markAsDirty();
	}

	insertSMSLegend(inputSelector, legend) {
		this.commonService.insertLegend(inputSelector, legend);
		this.basicDetailsForm.patchValue({
			SMSBody: (<any>this.smsBody).nativeElement.value
		});
		this.basicDetailsForm.controls.SMSBody.markAsDirty();
	}

	insertLegendSummernote(inputSelector, legend) {
		this.insertLegends.insertLegendSummernote(inputSelector, legend);
	}

	cancelCreatingNewCampaign() {

		swal.fire({
			title              : 'Unsaved changes will be lost.',
			text               : 'Are you sure ?',
			icon               : 'warning',
			showCancelButton   : true,
			cancelButtonText   : 'No',
			confirmButtonColor : '#d63030',
			confirmButtonText  : 'Yes'
		}).then((input) => {
			input.value && this.activeModal.hide();
		});
	}

	// #ED5565


	addCandidates(selectedCandidates){
		this.saveBtnDisabled = true;
		this.selectedCandidates = selectedCandidates.map((element:any) => {
			return {
				'CandidateApplicationId':element.CandidateApplicationId,
				'Email': element.Email,
				'UpdatedOn': element.UpdatedOn ? element.UpdatedOn : element.CreatedOn,
				'UnsubscribeCandidateEngagement': element.UnsubscribeCandidateEngagement,
			}
		});
		if(this.selectedCandidates.length >= 1 && this.selectedCandidates.length <= 50){
			this.saveBtnDisabled = false;
		}
	}

	addEditCampaign(){
		this.triggerConfigurations = this.triggerConfigurations.map((element) => {
			element.TriggerConfigurations.Activity = "campaign";
			element.SMSTemplateConfigViewModel.SMSTemplateDetails.SMSBody = this.basicDetailsForm.value.SMSBody;
			element.SMSTemplateConfigViewModel.SMSTemplateDetails.IsActive = this.basicDetailsForm.value.EnableSMSCampaign;
			element.EmailTemplateConfigViewModel.EmailTemplateDetails.IsActive = this.basicDetailsForm.value.EnableEmailCampaign;
			element.EmailTemplateConfigViewModel.EmailTemplateDetails.Subject = this.basicDetailsForm.value.Subject;
			element.EmailTemplateConfigViewModel.EmailTemplateDetails.EmailBody = '<div style="line-hieght:1.5em"><div><p class="MsoNoSpacing">' + this.basicDetailsForm.value.EmailBody + '</p></div></div>';
			element.EmailTemplateConfigViewModel.EmailTemplateDetails.Signature = this.basicDetailsForm.value.Signature;
			return element;
		}); 

		let campaignData = {
			"AddUpdateCampaign": {
				"accountId": this.AccountId,
				"campaignTitle": this.basicDetailsForm.value.Title,
				"campaignDescription": this.basicDetailsForm.value.Description,
				"candidateApplications": this.selectedCandidates,
				"isActive": true,
				"isCampaignTriggerEnabled": false,
				"isDeleted": false
			},
			"triggerConfigurations": this.triggerConfigurations
		};
		

		if(this.isEdit){
			campaignData["AddUpdateCampaign"]["campaignId"] = this.campaignDetails.CampaignId;
			this.editCampaign(campaignData);
		}else{
			this.addNewCampaign(campaignData);
		}
	}
	

	addNewCampaign(campaignData){
		this.campaignService.addCampaign(campaignData).subscribe(() => {
			this.activeModal.hide();
		},()=>{			//written to handle 412 response code of the api. We will get this code when we add duplicate candidates in the campaign.
			this.activeModal.hide();
		});
	}
	
	editCampaign(campaignData){
		this.campaignService.updateCampaign(campaignData).subscribe(()=> {
			this.activeModal.hide();
		},()=>{			//written to handle 412 response code of the api. We will get this code when we add duplicate candidates in the campaign.
			this.activeModal.hide();
		});
	}

	getTooltipMessageForSaveBtn(){
		if(!this.basicDetailsForm.value.EnableEmailCampaign && !this.basicDetailsForm.value.EnableSMSCampaign){
			return 'Please select at least one template Configuration.';
		}
		if(this.saveBtnDisabled){
			if(this.selectedCandidates){
				if(this.selectedCandidates.length<1){
					return 'Please select at least one candidate for the campaign.';
				}
				if(this.selectedCandidates.length>50){
					return 'You cannot add more than 50 candidates in one campaign.';
				}
			}
		}

	}

	//for campaign
	getTooltIipMessageForNextBtn(){
		if(!(this.copyCampaignForm.value.smsTemplate || this.copyCampaignForm.value.emailTemplate || this.copyCampaignForm.value.candidates)){
			return 'Select atleast one option to copy.';
		}else{
			return '';
		}
	}

	copyCampaign(){
		this.showSecondStep = true;
		this.copyCandidates		  = this.copyCampaignForm.value.candidates;
		this.copySMSTemplate 		= this.copyCampaignForm.value.smsTemplate;
		this.copyEmailTemplate  = this.copyCampaignForm.value.emailTemplate;

			this.basicDetailsForm.patchValue({
				'Title' : this.campaignDetails.CampaignTitle,
				'Description' : this.campaignDetails.CampaignDescription
			});

			if(this.copySMSTemplate){
				this.basicDetailsForm.patchValue({
					'EnableSMSCampaign' : this.templates[0].SMSTemplateConfigViewModel.SMSTemplateDetails.IsActive,
					'SMSBody' : this.templates[0].SMSTemplateConfigViewModel.SMSTemplateDetails.SMSBody,
				});
			}

			if(this.copyEmailTemplate){
				this.basicDetailsForm.patchValue({
					'EnableEmailCampaign' : this.templates[0].EmailTemplateConfigViewModel.EmailTemplateDetails.IsActive,
					'Subject' : this.templates[0].EmailTemplateConfigViewModel.EmailTemplateDetails.Subject,
					'EmailBody' : this.templates[0].EmailTemplateConfigViewModel.EmailTemplateDetails.EmailBody,
					'Signature' : this.templates[0].EmailTemplateConfigViewModel.EmailTemplateDetails.Signature,
				});
			}

			if(this.copySMSTemplate || this.copyEmailTemplate){
				this.triggerConfigurations = this.templates;
			}else{
				this.getTriggerConfigurations().subscribe((response) => {
					this.triggerConfigurations = response;
				});;
			}

			if(this.copyCandidates){
				this.candidatesInTheCampaign =  this.candidatesList.Candidates;
				if(this.candidatesList.Count>0){
					this.saveBtnDisabled = false;
				}else{
					this.saveBtnDisabled = true;
				}
			}
	}

	//api call
	getCandidates(){
		return this.campaignService.getCampaignCandidates(this.campaignSearchOptions);
	}

	getTriggerConfigurations(){
		let param = {
			"TemplateConfig":{
				"TemplateType":"default",
				"Category":"campaign",
				"AccountId": this.AccountId,
				"CampaignId": this.campaignSearchOptions.campaignId
			},"IsForCopy": this.campaignSearchOptions.isForCopy
		}
		return this.campaignService.getCampaignTriggerConfigurations(param)
	}

	ngOnDestroy(){
		this.smsCampaign.unsubscribe();
		this.emailCampaign.unsubscribe();
	}

}
