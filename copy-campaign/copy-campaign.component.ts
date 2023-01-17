import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { AuthenticationService, LoggedInUser } from '@appcore/authentication';
import { CampaignSearchOptions } from '@appcore/model/CampaignModels/campaignDto';
import { CampaignService } from '@appcore/services/campaign.service';
import { BsModalRef, BsModalService } from 'ngx-bootstrap';
import { Subscription } from 'rxjs';
import { AddNewCampaignComponent } from '../add-new-campaign/add-new-campaign.component';

@Component({
	selector: 'app-copy-campaign',
	templateUrl: './copy-campaign.component.html',
	styleUrls: ['./copy-campaign.component.scss']
})
export class CopyCampaignComponent implements OnInit {

	campaignSearchOptions: Partial<CampaignSearchOptions> = {};
	accountId: any;
	campaign: any;
	singleMailBoxAccount: boolean;
	copyCampaignForm: FormGroup;
	subscriptions: Subscription[] = [];
	loggedInUser : LoggedInUser;
	
	constructor(
		private modalService          : BsModalService,
		public  activeModal 					: BsModalRef,
		private formBuilder						: FormBuilder,
		private campaignService				: CampaignService,
		private authenticationService : AuthenticationService
	) { 
		this.copyCampaignForm = this.formBuilder.group({
			smsTemplate : new FormControl(true),
			emailTemplate : new FormControl(true),
			candidates : new FormControl(false),
		});
	}

	ngOnInit() {
		this.loggedInUser = this.authenticationService.loggedInUser;
		this.campaignSearchOptions.isForCopy = true;
		this.campaignSearchOptions.AccountId = this.accountId;
		this.campaignSearchOptions.campaignId = this.campaign.CampaignId;
	}

	getTooltIipMessageForNextBtn(){
		if(!(this.copyCampaignForm.value.smsTemplate || this.copyCampaignForm.value.emailTemplate || this.copyCampaignForm.value.candidates)){
			return 'Select atleast one option to copy.';
		}else{
			return '';
		}
	}

	getCampaignDetails(){
		return this.campaignService.getCampaigns(this.campaignSearchOptions);
	}

	openAddNewCampaignModal(campaignDetails: any){
		let initialState = {
			AccountId : this.accountId,
			isForCopy : true,
			singleMailBoxAccount : this.singleMailBoxAccount,
			campaignDetails: campaignDetails,
			copySMSTemplate : this.copyCampaignForm.value.smsTemplate,
			copyEmailTemplate : this.copyCampaignForm.value.emailTemplate,
			copyCandidates : this.copyCampaignForm.value.candidates
		};

		this.modalService.show(AddNewCampaignComponent, { initialState, class: 'modal-xl', ignoreBackdropClick: true 	});
		this.subscriptions.push(
			this.modalService.onHidden.subscribe(() => {
				this.activeModal.hide();
				this.unsubscribe();
			})
		);
	}

	copyCampaign(){
		this.getCampaignDetails().subscribe((response: any) => {
			this.openAddNewCampaignModal(response);
		});
	}


	unsubscribe() {
		this.subscriptions[0].unsubscribe();
		this.subscriptions = [];
	}

}
