---
layout: post
title: Thoughts on ActiveRecord Callbacks
excerpt: Guidelines I use for determining if and how I want to use everyone's favorite before/after hooks in Rails
published: true
category: rails
keywords: ruby,rails,activerecord,active,record
---
At the office recently we had a discussion about if/when to use ActiveRecord callbacks and I ended up condensing the below into a blog post from my own opinions.

Let me be clear that I absolutely love using AR callbacks, but I've definitely been burned in the past by over/inappropriate use so I'm much more cautious about them nowadays.

I don't have any hard and fast rules about using callbacks, other than "Don't send emails" and that's because I've been burned by it more than once and it's just not worth it.

What I do have is a ~~very particular set of skills. Skills I have acquired over a very long career.~~ few guidelines I try to go by relating to them.

1. **Intention**: Is the thing I'm trying to accomplish something that someone very specifically intends to happen, or is it reasonable to be expected as a side effect of a very generic action:
    - ie: I think it's reasonable for an address to be geocoded to lat/long on save, but find it less reasonable for student's expiration date to be extended if they change their hair color.
2. **Context**: When do I _actually_ want this behavior to trigger? It's easy to think of things from a database/ActiveRecord perspective and say "On save of course!", but I find the more often I stop and think about it, the less that tends to be the case.  There's usually some caveat like "On save...after I register", and often it's even more specific than that: "On save...after I register...from the storefront".  If I find myself tacking extra context on to the save, maybe the callback isn't as good of a fit as it seemed at first.
3. **Consequence**: What are the immediate, and potential downstream, effects we might see from this behavior?  Some questions I might ask myself:
    - Is it limited to just the object I'm saving or does it affect associated (or even unassociated) objects?
    - Does it make external api calls or trigger some other behavior elsewhere in the stack (potentially even in a whole other app)?
    - Is the change a minor one (transforming some fields on the object), or something (much) bigger?
    - If this behavior fails, should it interrupt the `save` of the object in question, or should it be asynchronous?
4. **Performance**: This is more of a subset of the above, but I think it's worth its own consideration.
    - What is the potential impact this might have on any given request?
    - Does it fire off additional SQL queries? How fast/slow are those?
    - Does it make an external API request? That's almost definitely going to be slower than we want to tag on to our current request.  How do we handle failure states for that request?
    - Does it generate an email/sms/fax/smoke signal/push notification? (IT BETTER NOT, see my first sentence)
    - Is it just a really slow and complex calculation that's gonna take a bit to complete?
  
None of the above points by themselves immediately disqualifies using a callback, in my book, but the more of them I find myself answering in a negative fashion, the less likely I'll be to reach for them.

Now all of that is great, but what do we do if we determine callbacks aren't the best option?  Glad you asked, here's the different tactics I've used or seen used:

1. **Just use a callback!**
    - "But...you just said..." Yeah yeah I know. Sometimes we make inefficient/bad choices under time crunches and we'll have to pay for it later. As long as you're not sending an email with it, we'll figure it out I'm sure.  Please try to add some specs around it though.  However, if you're gonna go this route lemme introduce you to another option:
2. **Use what I call an Imperative Callback.** It's a callback that will only fire when you, from some external source, explicitly tell it to fire.  The format you see this in goes like this:
    ```ruby
    class Plan < ApplicationRecord
      attr_accessor :is_coming_together

      after_save :say_catchphrase

      def say_catchphrase
        if is_coming_together
          puts "I love it when a plan comes together"
        end
      end
    end

    class PlansController < ApplicationController
      def update
        @plan = Plan.find(params[:id])
        if @plan.update(plan_params)
          # do the success thing
        else
          # do the error thing
        end
      end

      def plan_params
        params.require(:plan).permit(:checklist, :success, :is_coming_together)
      end
    end
    ```
  Now when we save our Plan object (from an API call or a form), we can pass `is_coming_together: 1/true/something_truthy` along with our other params and our catchphrase will fire off.  All other saves however will not trigger this behavior since `is_coming_together` will be `nil` by default.  This approach doesn't make me feel very warm and fuzzy inside, but at least feels like a lesser evil.
3. **Just make it a new method and call that method where you need to.**  Ex: You might add a `complete` method to your `Sale` class that sends the receipt email, updates the customer's last transaction date, and a few other items.  This new `complete` method could be called in your controllers after saving, leaving your `save` behavior safe to run in a rails console if needed.
4. **Just dump the logic in the controller.**  I'm generally not a fan of this, as I more prefer "Fat Models, Skinny Controllers" and it's easy for this kind of stuff to inverse the relationship.  But if this is the first iteration of a feature, and it's a small amount of code, sometimes it's not the worst idea.
5. **Service Objects:** Aww yeah, now we're getting to the moist center of this debate. If you've got some complex behavior that you want to fire in several spots related to a given model, why not wrap that all up in its own object.  It's basically the Stefan Urquelle to option number 3's Steve Urkel.  Peep this:
    ```ruby
    class ExecutePlan
      def initialize(plan)
        @plan = plan
      end

      def execute
        return nil unless @plan.save
        if is_coming_together?
          ATeamSMS.send_message("I love it when a plan comes together")
        end
      end

      def is_coming_together?
        mr_t_pitied_the_fool? &&
          cigar_was_smoked? &&
          splosions? &&
          saved_the_day?
      end

      private

      def mr_t_pitied_the_fool?; end
      def cigar_was_smoked?; end
      def splosions; end
      def saved_the_day?; end
    end
    ```
6. **Start your own callbacks, with before before hooks and after before hooks!!** Did you know you can add your own callbacks pretty easily to any `ActiveSupport` object? I've never actually done this before, but it's a neat idea that might be worth a shot in the right situation (also no idea if this code would actually work or not)
    ```ruby
    class Plan < ApplicationRecord
      define_model_callbacks :execute, :only => [:before, :after]
      after_execute :say_catchphrase

      def execute
        run_callbacks :execute do
          save!
        end
      end

      def say_catchphrase
        puts "Hasta la vista"
        sleep 60000
        puts "...baby"
      end
    end
    ```

