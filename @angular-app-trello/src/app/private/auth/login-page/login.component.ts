import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {AuthService} from 'src/app/services/auth.service';
import {TokenService} from "../../../services/token.service";
import {ErrorService} from "../../../services/error.service";

import {IAuthResponse, ISingIn} from 'src/app/interfaces';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  public message: string = '';
  public submitted: boolean = false;

  form: FormGroup = new FormGroup({
    email: new FormControl(null, [
      Validators.required,
      Validators.email
    ]),
    password: new FormControl(null, [
      Validators.required,
      Validators.minLength(6)
    ])
  });

  constructor(
    public authService: AuthService,
    public tokenService: TokenService,
    public errorService: ErrorService,
    public router: Router,
    public route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params: Params) => {
      if (params['loginAgain']) {
        this.message = 'Please enter data';
      }
    })
  }

  signInWithGoogle() {
    window.open("http://localhost:5000/auth/google", "_blank");
  }

  submit() {
    if (this.form.invalid) {
      return;
    }

    this.submitted = true;

    const user: ISingIn = {
      email: this.form.value.email,
      password: this.form.value.password
    }

    console.log(user)

    this.authService.singIn$(user)
      .subscribe((response: IAuthResponse) => {
        console.log('response', response)
        this.tokenService.setToken(response.accessToken);
        this.form.reset();
        this.router.navigate(['/admin', 'boards']);
      });
  }
}
